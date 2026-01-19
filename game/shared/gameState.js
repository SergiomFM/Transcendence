// Game state manager for Pong multiplayer
const { GAME_CONSTANTS, degreesToRadians } = require("./constants");
const Physics = require("./physics");
const { EventEmitter } = require("./spells");

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // WebSocket -> player data
    this.maxPlayers = 2;
    this.createdAt = Date.now();
    this.running = false;
    this.loaded = false;

    // Game state
    this.ball = {
      x: 0,
      y: GAME_CONSTANTS.BALL_Y,
      z: 0,
      speed: GAME_CONSTANTS.BALL_INITIAL_SPEED,
      angle: degreesToRadians(GAME_CONSTANTS.BALL_INITIAL_ANGLE_DEG),
      cos: 0,
      sin: 1,
      radius: GAME_CONSTANTS.BALL_RADIUS,
      color: { r: 1, g: 1, b: 1, a: 1 },
    };

    this.player1 = this.createPlayer(1, GAME_CONSTANTS.PLAYER1_Z);
    this.player2 = this.createPlayer(2, GAME_CONSTANTS.PLAYER2_Z);

    this.physics = new Physics(this);
    this.events = new EventEmitter();

    this.events.on("spell", (spell, gamePlayer) => {
      // Assign a color for each spell
      const spellColors = {
        angleSwitch: { r: 1, g: 0, b: 1, a: 1 }, // magenta
        shot: { r: 0, g: 1, b: 0, a: 1 }, // green
        portal: { r: 1, g: 0, b: 0, a: 1 }, // red
        stop: { r: 0, g: 0, b: 1, a: 1 }, // blue
        back: { r: 1, g: 1, b: 0, a: 1 }, // yellow
        iman: { r: 1, g: 0, b: 1, a: 1 }, // magenta
      };
      if (spellColors[spell]) {
        this.ball.color = spellColors[spell];
      }
      switch (spell) {
        case "angleSwitch":
          this._angleActive = true;
          this.physics.setBallAngle(Math.PI - this.ball.angle);
          break;
        case "shot":
          this._shotActive = true;
          this.ball.speed *= 2;
          if (this.ball.angle > 0 && this.ball.angle < Math.PI)
            this.physics.setBallAngle(degreesToRadians(90));
          else this.physics.setBallAngle(degreesToRadians(270));
          break;
        case "portal":
          this._portalActive = true;
          this._portalLastXDir = Math.sign(this.ball.cos);
          this._portalLastZDir = Math.sign(this.ball.sin);
          break;
        case "stop":
          this._stopActive = true;
          this._stopOriginalPosition = {
            x: this.ball.x,
            y: this.ball.y,
            z: this.ball.z,
          };
          break;
        case "back":
          this._backActive = true;
          this.physics.setBallAngle(this.ball.angle + Math.PI);
          break;
        case "iman":
          this._imanActive = true;
          this._imanPlayer = gamePlayer;
          break;
        default:
          break;
      }
      this.broadcastSpellActivated({
        playerId: gamePlayer.id,
        spellType: spell,
      });
    });
    GameRoom.prototype.broadcastSpellActivated = function ({
      playerId,
      spellType,
    }) {
      const message = JSON.stringify({
        type: "SPELL_ACTIVATED",
        playerId,
        spellType,
      });
      this.players.forEach((player) => {
        try {
          player.connection.send(message);
        } catch (error) {
          console.error("Error sending SPELL_ACTIVATED to player:", error);
        }
      });
    };
    // Game loop
    this.lastUpdate = Date.now();
    this.lastStateUpdate = Date.now();
    this.gameLoopTimeout = null;
  }

  createPlayer(id, zPosition) {
    return {
      id: id,
      x: 0,
      z: zPosition,
      currSpeed: 0,
      maxSpeed: GAME_CONSTANTS.PADDLE_MAX_SPEED,
      originalMaxSpeed: GAME_CONSTANTS.PADDLE_MAX_SPEED,
      drag: GAME_CONSTANTS.PADDLE_DRAG,
      direction: 0,
      inputDirection: 0,
      failed: false,
      ready: false,
      size: GAME_CONSTANTS.PADDLE_SIZE,
      score: 0,

      // Dash
      dashActive: false,
      dashReady: false,
      dashCooldown: GAME_CONSTANTS.DASH_COOLDOWN,
      dashElapsedCooldown: 0,
      dashDuration: GAME_CONSTANTS.DASH_DURATION,
      dashElapsedActive: 0,

      spells: {
        counter: { active: false, cooldown: 0 },
        offensive: { active: false, cooldown: 0 },
      },
    };
  }

  addPlayer(connection, playerData) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, reason: "Room is full" };
    }

    const playerId = this.players.size === 0 ? 1 : 2;

    this.players.set(connection, {
      id: playerId,
      connection: connection,
      ...playerData,
    });

    // If room is full, start the game
    if (this.players.size === this.maxPlayers) {
      this.loaded = true;
      this.startGameLoop();
    }

    return { success: true, playerId: playerId };
  }

  removePlayer(connection) {
    this.players.delete(connection);

    // Stop game if a player leaves
    if (this.gameLoopTimeout) {
      clearTimeout(this.gameLoopTimeout);
      this.gameLoopTimeout = null;
    }

    // Return true if room is now empty
    return this.players.size === 0;
  }

  handlePlayerInput(connection, input) {
    const player = this.players.get(connection);
    if (!player) return;

    const gamePlayer = player.id === 1 ? this.player1 : this.player2;

    // Update input direction
    gamePlayer.inputDirection = input.direction || 0;

    // Handle ready state
    if (input.ready !== undefined) {
      gamePlayer.ready = input.ready;
    }

    // Handle dash activation
    if (input.dash && gamePlayer.dashReady) {
      gamePlayer.dashActive = true;
    }

    // Handle spell activation
    if (input.spell) {
      this.events.emit("spell", input.spell, gamePlayer);
    }
  }

  startGameLoop() {
    if (this.gameLoopTimeout) return;
    let lastUpdate = performance.now();

    const loop = () => {
      const now = performance.now();
      const delta = now - lastUpdate;
      if (delta >= GAME_CONSTANTS.TICK_RATE) {
        this.update(delta / 1000); // Convert to seconds
        lastUpdate = now - (delta % GAME_CONSTANTS.TICK_RATE);
      }
      this.gameLoopTimeout = setTimeout(loop, 1);
    };
    loop();
  }

  update(delta) {
    // Check if both players are ready
    if (!this.running) {
      if (!this.loaded) return;
      if (!this.player1.ready || !this.player2.ready) return;
      this.running = true;
    }

    // SPELL: BallAngleSwitch (reverse ball direction once)
    if (this._angleActive) {
      this._angleDuration = (this._angleDuration || 0) + delta * 1000;
      if (this._angleDuration >= 500) {
        this._angleActive = false;
        this._angleDuration = 0;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }
    // SPELL: BallShot (speed boost with duration)
    if (this._shotActive) {
      this._shotDuration = (this._shotDuration || 0) + delta * 1000;
      if (this._shotDuration >= 500) {
        this._shotActive = false;
        this._shotDuration = 0;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }

    // SPELL: BallBack (reverse ball direction once)
    if (this._backActive) {
      this._backDuration = (this._backDuration || 0) + delta * 1000;
      if (this._backDuration >= 500) {
        this._backActive = false;
        this._backDuration = 0;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }

    // SPELL: BallStop (stop ball for duration)
    if (this._stopActive) {
      // Keep ball at original position
      this.ball.x = this._stopOriginalPosition.x;
      this.ball.y = this._stopOriginalPosition.y;
      this.ball.z = this._stopOriginalPosition.z;
      this._stopDuration = (this._stopDuration || 0) + delta * 1000;
      if (this._stopDuration >= 2000) {
        // 2s duration
        this._stopActive = false;
        this._stopDuration = 0;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }

    // SPELL: BallIman (attract ball angle to player)
    if (this._imanActive && this._imanPlayer) {
      let player = this._imanPlayer;
      let ballToPaddleAngle = Math.atan2(
        player.z - this.ball.z,
        player.x - this.ball.x,
      );
      let direction = -1;
      if (
        this.ball.angle - ballToPaddleAngle <
        ballToPaddleAngle - this.ball.angle
      )
        direction = 1;
      let deviation = degreesToRadians(90) * delta * direction;
      this.physics.setBallAngle(this.ball.angle + deviation);
      this._imanDuration = (this._imanDuration || 0) + delta * 1000;
      if (this._imanDuration >= 1000) {
        // 1s duration
        this._imanActive = false;
        this._imanDuration = 0;
        this._imanPlayer = null;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }

    // SPELL: BallPortal (teleport ball to opposite wall)
    if (this._portalActive) {
      if (
        this._portalLastZDir == Math.sign(this.ball.sin) &&
        this._portalLastXDir != Math.sign(this.ball.cos)
      ) {
        this.ball.x *= -1;
        this.physics.setBallAngle(Math.PI - this.ball.angle);
        this._portalActive = false;
      }
      this._portalLastXDir = Math.sign(this.ball.cos);
      this._portalLastZDir = Math.sign(this.ball.sin);
      this._portalDuration = (this._portalDuration || 0) + delta * 1000;
      if (this._portalDuration >= 500) {
        this._portalActive = false;
        this._portalDuration = 0;
        this._portalPlayer = null;
        this.ball.color = { r: 1, g: 1, b: 1, a: 1 }; // Reset color to white
      }
    }

    // Update physics (skip ball update if stop spell is active)
    this.physics.updatePaddle(this.player1, delta);
    this.physics.updatePaddle(this.player2, delta);
    let collision = null;
    if (!this._stopActive) {
      collision = this.physics.updateBall(delta);
    }

    // Send collision events immediately for VFX
    if (collision) {
      this.broadcastEvent(collision);

      if (collision.type === "GOAL") {
        this.running = false;
        this.broadcastState();
      }
    }

    this.broadcastState();
  }

  getState() {
    return {
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        z: this.ball.z,
        speed: this.ball.speed,
        angle: this.ball.angle,
        color: this.ball.color,
      },
      player1: {
        x: this.player1.x,
        z: this.player1.z,
        score: this.player1.score,
        ready: this.player1.ready,
        dashReady: this.player1.dashReady,
      },
      player2: {
        x: this.player2.x,
        z: this.player2.z,
        score: this.player2.score,
        ready: this.player2.ready,
        dashReady: this.player2.dashReady,
      },
      running: this.running,
    };
  }

  broadcastState() {
    const state = this.getState();
    const message = JSON.stringify({
      type: "STATE_UPDATE",
      state: state,
      timestamp: Date.now(),
    });

    this.players.forEach((player) => {
      try {
        player.connection.send(message);
      } catch (error) {
        console.error("Error sending state to player:", error);
      }
    });
  }

  broadcastEvent(event) {
    const message = JSON.stringify({
      type: "GAME_EVENT",
      event: event,
      timestamp: Date.now(),
    });

    this.players.forEach((player) => {
      try {
        player.connection.send(message);
      } catch (error) {
        console.error("Error sending event to player:", error);
      }
    });
  }

  cleanup() {
    if (this.gameLoopTimeout) {
      clearTimeout(this.gameLoopTimeout);
      this.gameLoopTimeout = null;
    }
  }
}

class GameRoomManager {
  constructor() {
    this.rooms = new Map();
    this.waitingPlayers = [];
  }

  findOrCreateRoom(connection, playerData) {
    // Try to find a waiting room
    for (const [roomId, room] of this.rooms) {
      if (room.players.size < room.maxPlayers) {
        const result = room.addPlayer(connection, playerData);
        if (result.success) {
          return { room, playerId: result.playerId };
        }
      }
    }

    // Create a new room
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId);
    this.rooms.set(roomId, room);

    const result = room.addPlayer(connection, playerData);
    return { room, playerId: result.playerId };
  }

  removePlayerFromRoom(connection) {
    for (const [roomId, room] of this.rooms) {
      if (room.players.has(connection)) {
        const isEmpty = room.removePlayer(connection);

        if (isEmpty) {
          room.cleanup();
          this.rooms.delete(roomId);
        }

        return;
      }
    }
  }

  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRoomForConnection(connection) {
    for (const room of this.rooms.values()) {
      if (room.players.has(connection)) {
        return room;
      }
    }
    return null;
  }
}

module.exports = { GameRoom, GameRoomManager };
