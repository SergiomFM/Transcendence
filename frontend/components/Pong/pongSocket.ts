import { Pong } from "./pong";
import { splashEffect, COLLISION_VFX } from "./pongVFX";
import { Vector3, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";

export function connectToGameServer(
  pong: Pong,
  serverUrl: string = "ws://localhost:3002/pong",
) {
  console.log("Connecting to game server:", serverUrl);

  pong.socket = new WebSocket(serverUrl);

  pong.socket.onopen = (event) => {
    console.log("✅ Connected to game server");

    // Join the game immediately upon connection
    pong.socket!.send(
      JSON.stringify({
        type: "JOIN_GAME",
        playerData: {
          name: "Player",
          timestamp: Date.now(),
        },
      }),
    );
  };

  pong.socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(pong, message);
    } catch (error) {
      console.error("Error parsing server message:", error);
    }
  };

  pong.socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  pong.socket.onclose = (event) => {
    console.log("❌ Disconnected from game server");
    pong.online = false;

    // Show disconnect message to player
    if (pong.GUI) {
      pong.GUI.textFadeIn("DISCONNECTED");
    }
  };
}

function handleServerMessage(pong: Pong, message: any) {
  switch (message.type) {
    case "JOINED_GAME":
      handleJoinedGame(pong, message);
      break;

    case "WAITING":
      handleWaiting(pong, message);
      break;

    case "GAME_READY":
      handleGameReady(pong, message);
      break;

    case "GAME_START":
      handleGameStart(pong, message);
      break;

    case "STATE_UPDATE":
    case "GAME_STATE":
      handleGameState(pong, message);
      break;

    case "GAME_EVENT":
      handleGameEvent(pong, message);
      break;

    case "COLLISION":
      handleCollision(pong, message);
      break;

    case "SCORE":
      handleScore(pong, message);
      break;

    case "SPELL_ACTIVATED":
      handleSpellActivation(pong, message);
      break;

    case "SPELL_SWITCHED":
      handleSpellSwitched(pong, message);
      break;

    case "PLAYER_DISCONNECTED":
      handlePlayerDisconnected(pong, message);
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

function handleJoinedGame(pong: Pong, message: any) {
  console.log("Joined game room:", message.roomId);
  console.log("You are player:", message.playerId);

  pong.playerId = message.playerId;
  pong.online = true;

  Events.assignKeys(pong);

  if (pong.GUI) {
    const playerTextName = message.playerId === 1 ? "PLAYER_1" : "PLAYER_2";
    pong.GUI.textFadeIn(playerTextName, 2000);
  }
}

function handleWaiting(pong: Pong, message: any) {
  console.log(message.message);

  if (pong.GUI) {
    // Waiting message persists until other player joins
    pong.GUI.textFadeIn("WAITING");
  }
}

function handleGameReady(pong: Pong, message: any) {
  console.log("Game ready:", message.message);

  if (pong.GUI) {
    pong.GUI.textFadeOut("WAITING");

    if (pong.playerId === 1) {
      pong.GUI.textFadeIn("PLAYER_2_CONNECTED", 2000);
    }

    pong.GUI.textFadeIn("START");
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleGameStart(pong: Pong, message: any) {
  console.log("Game starting!");
  pong.running = true;

  if (pong.GUI) {
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleGameState(pong: Pong, message: any) {
  pong.serverGameState = message.state;
  pong.serverGameStateApplied = false;
}

function handleGameEvent(pong: Pong, message: any) {
  const event = message.event;

  if (!event) return;

  switch (event.type) {
    case "GAME_READY":
      handleGameReady(pong, event);
      break;
    case "GAME_START":
      handleGameStart(pong, event);
      break;
    case "WALL_COLLISION":
    case "PADDLE_COLLISION":
      handleCollision(pong, { collision: event });
      break;
    case "GOAL":
      handleScore(pong, event);
      break;
    default:
      console.log("Unknown game event:", event.type);
  }
}

function handleCollision(pong: Pong, message: any) {
  if (!message.collision) return;

  const { position, speed, angle, type } = message.collision;

  let splashZ = position.z;
  let splashAngle = -angle;

  if (pong.playerId === 2) {
    splashZ = -position.z;
    splashAngle = angle;
  }

  splashEffect(
    pong.scene,
    new Vector3(position.x, position.y, splashZ),
    speed,
    splashAngle,
    COLLISION_VFX,
  );
}

function handleScore(pong: Pong, message: any) {
  console.log("Score!", message);

  const { winner, score } = message;

  if (pong.GUI) {
    if (winner === pong.playerId) {
      pong.GUI.textFadeIn("YOU_WON");
    } else {
      pong.GUI.textFadeIn("YOU_LOST");
    }
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleSpellActivation(pong: Pong, message: any) {
  console.log("Spell activated:", message);

  let player;
  if (message.playerId === pong.playerId) {
    player = pong.player1; // me
  } else {
    player = pong.player2; // opponent
  }

  // Map spellType to the correct spell instance
  // Offensive spells (right hand)
  if (["angleSwitch", "shot", "portal"].includes(message.spellType)) {
    if (
      player.offensiveSpell &&
      typeof player.offensiveSpell.activateSpell === "function"
    ) {
      player.offensiveSpell.activateSpell();
    }
  }
  // Counter spells (left hand)
  else if (["stop", "back", "iman"].includes(message.spellType)) {
    if (
      player.counterSpell &&
      typeof player.counterSpell.activateSpell === "function"
    ) {
      player.counterSpell.activateSpell();
    }
  } else {
    console.warn("Unknown spellType in SPELL_ACTIVATED", message.spellType);
  }
}

function handleSpellSwitched(pong: Pong, message: any) {
  console.log("Spell switched:", message);

  // Update the opponent's spell color
  let opponent;
  if (message.playerId === pong.playerId) {
    opponent = pong.player2; // I switched, update opponent
  } else {
    opponent = pong.player1; // Opponent switched, update their view
  }

  const color = new Color4(
    message.spellColor.r,
    message.spellColor.g,
    message.spellColor.b,
    message.spellColor.a,
  );

  if (message.isOffensive) {
    if (opponent.offensiveSpell) {
      opponent.offensiveSpell.color = color;
      opponent.offensiveSpell.setSpellColor();
    }
  } else {
    if (opponent.counterSpell) {
      opponent.counterSpell.color = color;
      opponent.counterSpell.setSpellColor();
    }
  }
}

function handlePlayerDisconnected(pong: Pong, message: any) {
  console.log("Player disconnected:", message.message);

  pong.running = false;

  if (pong.GUI) {
    pong.GUI.textFadeIn("OPPONENT_LEFT");
  }
}

export function sendReady(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "READY",
      }),
    );
  }
}

export function sendDash(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "DASH",
      }),
    );
  }
}

export function sendSpell(pong: Pong, spellType: string) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "SPELL",
        spellType: spellType,
      }),
    );
  }
}

export function sendSwitchSpell(pong: Pong, spellType: string) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "SWITCH_SPELL",
        spellKey: spellType,
      }),
    );
  }
}

export function disconnectFromServer(pong: Pong) {
  if (pong.socket) {
    pong.socket.close();
    pong.socket = undefined;
    pong.online = false;
  }
}
