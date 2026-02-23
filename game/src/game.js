const {
	GAME_CONSTANTS,
	degreesToRadians,
	spellTypes,
	spellCycles,
	SPELL_CONSTANTS,
} = require("./constants");
const Physics = require("./physics");
const { EventEmitter } = require("events");

class GameRoom {
	constructor(roomId) {
		this.roomId = roomId;
		this.createdAt = Date.now();
		this.running = false;
		this.loaded = false;
		this.startingRound = false;

		this.initializeBall();

		this.player1 = this.createPlayer(1, GAME_CONSTANTS.PLAYER1_Z);
		this.player2 = this.createPlayer(2, GAME_CONSTANTS.PLAYER2_Z);

		// Player connection tracking
		this.player1.connection = null;
		this.player2.connection = null;
		this.spectators = new Set();

		this.physics = new Physics(this);
		this.events = new EventEmitter();

		// Initialize all spell state flags and durations
		this.resetSpellState();

		// Event to handle spell related player Inputs
		this.createSpellUsedEvent();

		// Game loop variables
		this.lastUpdate = Date.now();
		this.lastStateUpdate = Date.now();
		this.gameLoopTimeout = null;
	}

	initializeBall() {
		this.ball = {
			x: 0,
			y: GAME_CONSTANTS.BALL_Y,
			z: 0,
			speed: GAME_CONSTANTS.BALL_INITIAL_SPEED,
			angle: degreesToRadians(GAME_CONSTANTS.BALL_INITIAL_ANGLE_DEG),
			cos: 0,
			sin: 1,
			radius: GAME_CONSTANTS.BALL_RADIUS,
		};
	}

	useSpell(player, offensive) {
		const spellType = offensive
			? player.currentOffensiveSpell
			: player.currentCounterSpell;
		const spellKey = offensive ? "offensive" : "counter";
		const now = performance.now();
		const cooldown = SPELL_CONSTANTS[spellType];
		if (player.spells[spellKey].cooldown > now) {
			return;
		} else {
			player.spells[spellKey].cooldown = now + cooldown;
			if (this.events) {
				this.events.emit("spellUsed", player, offensive);
			}
		}
	}

	broadcastSpellUsed(playerID, offensive) {
		// Send to both players
		if (this.player1.connection) {
			try {
				this.player1.connection.send(
					JSON.stringify({
						type: "SPELL_USED",
						enemy: playerID === 1 ? false : true,
						offensive: offensive,
					}),
				);
			} catch (error) {
				console.error("Error sending SPELL_USED to player1:", error);
			}
		}

		if (this.player2.connection) {
			try {
				this.player2.connection.send(
					JSON.stringify({
						type: "SPELL_USED",
						enemy: playerID === 2 ? false : true,
						offensive: offensive,
					}),
				);
			} catch (error) {
				console.error("Error sending SPELL_USED to player2:", error);
			}
		}

		for (const spectator of this.spectators) {
			try {
				spectator.send(
					JSON.stringify({
						type: "SPELL_USED",
						enemy: playerID === 2,
						offensive: offensive,
					}),
				);
			} catch (error) {
				console.error("Error sending SPELL_USED to spectator:", error);
			}
		}
	}

	broadcastSpellSwitched(playerID, offensive, spellName) {
		const player1Message = JSON.stringify({
			type: "SPELL_SWITCHED",
			enemy: playerID === 1 ? false : true,
			offensive: offensive,
			spellName: spellName,
		});

		const player2Message = JSON.stringify({
			type: "SPELL_SWITCHED",
			enemy: playerID === 2 ? false : true,
			offensive: offensive,
			spellName: spellName,
		});

		const spectatorMessage = JSON.stringify({
			type: "SPELL_SWITCHED",
			enemy: playerID === 2,
			offensive: offensive,
			spellName: spellName,
		});

		// Send to both players
		if (this.player1.connection) {
			try {
				this.player1.connection.send(player1Message);
			} catch (error) {
				console.error("Error sending SPELL_USED to player1:", error);
			}
		}

		if (this.player2.connection) {
			try {
				this.player2.connection.send(player2Message);
			} catch (error) {
				console.error("Error sending SPELL_USED to player2:", error);
			}
		}

		for (const spectator of this.spectators) {
			try {
				spectator.send(spectatorMessage);
			} catch (error) {
				console.error("Error sending SPELL_SWITCHED to spectator:", error);
			}
		}
	}

	createSpellUsedEvent() {
		this.events.on("spellUsed", (player, offensive) => {
			const spellType = offensive
				? player.currentOffensiveSpell
				: player.currentCounterSpell;

			// Cast Spells in the backend
			switch (spellType) {
				case "ballAngleSwitch":
					this._angleActive = true;
					this.physics.setBallAngle(Math.PI - this.ball.angle);
					break;
				case "ballShot":
					this._shotActive = true;
					this.ball.speed *= SPELL_CONSTANTS.ballShotSpeedBoost;
					if (this.ball.angle > 0 && this.ball.angle < Math.PI) {
						this.physics.setBallAngle(degreesToRadians(90));
					} else {
						this.physics.setBallAngle(degreesToRadians(270));
					}
					break;
				case "ballPortal":
					this._portalActive = true;
					this._portalLastXDir = Math.sign(this.ball.cos);
					this._portalLastZDir = Math.sign(this.ball.sin);
					break;
				case "ballStop":
					this._stopActive = true;
					this._stopOriginalPosition = {
						x: this.ball.x,
						y: this.ball.y,
						z: this.ball.z,
					};
					break;
				case "ballBack":
					this._backActive = true;
					this.physics.setBallAngle(this.ball.angle + Math.PI);
					break;
				case "ballIman":
					this._imanActive = true;
					this._imanPlayer = player;
					break;
				default:
					break;
			}

			// Update all clients about the spell activation
			this.broadcastSpellUsed(player.id, spellTypes[spellType].offensive);
		});
	}

	createPlayer(id, zPosition) {
		const now = performance.now();
		return {
			id: id,
			name: null,
			x: 0,
			z: zPosition,
			currSpeed: 0,
			currDirection: 0,
			maxSpeed: GAME_CONSTANTS.PADDLE_MAX_SPEED,
			drag: GAME_CONSTANTS.PADDLE_DRAG,
			direction: 0,
			inputDirection: 0,
			failed: false,
			ready: false,
			size: GAME_CONSTANTS.PADDLE_SIZE,
			score: 0,

			// Current spells
			currentOffensiveSpell: "ballAngleSwitch",
			currentCounterSpell: "ballStop",

			spells: {
				counter: { active: false, cooldown: now + SPELL_CONSTANTS["ballStop"] },
				offensive: {
					active: false,
					cooldown: now + SPELL_CONSTANTS["ballAngleSwitch"],
				},
			},
		};
	}

	addPlayer(connection, playerData) {
		// Try to add to player1 slot first
		if (!this.player1.connection) {
			this.player1.connection = connection;
			connection.playerId = 1;
			connection.role = "player";
			this.player1.name = connection.userName || playerData?.name || null;
			// Reset scores for a fresh match when both seats are filled
			if (this.player2.connection) {
				this.player1.score = 0;
				this.player2.score = 0;
				this.loaded = true;
				this.startGameLoop();
			}
			return { success: true, playerId: 1 };
		}

		// Then try player2 slot
		if (!this.player2.connection) {
			this.player2.connection = connection;
			connection.playerId = 2;
			connection.role = "player";
			this.player2.name = connection.userName || playerData?.name || null;
			// Reset scores for a fresh match when both seats are filled
			if (this.player1.connection) {
				this.player1.score = 0;
				this.player2.score = 0;
				this.loaded = true;
				this.startGameLoop();
			}
			return { success: true, playerId: 2 };
		}

		// Room is full
		return { success: false, reason: "Room is full" };
	}

	addSpectator(connection) {
		this.spectators.add(connection);
		connection.playerId = null;
		connection.role = "spectator";
		return { success: true };
	}

	hasOpenPlayerSlot() {
		return !this.player1.connection || !this.player2.connection;
	}

	isSpectator(connection) {
		return this.spectators.has(connection);
	}

	promoteSpectator(connection) {
		if (!this.hasOpenPlayerSlot() || !this.isSpectator(connection)) {
			return { success: false, reason: "No open slot" };
		}
		this.spectators.delete(connection);
		return this.addPlayer(connection);
	}

	demotePlayerToSpectator(connection) {
		const wasPlayer =
			this.player1.connection === connection ||
			this.player2.connection === connection;
		if (!wasPlayer) {
			return { success: false, reason: "Not a player" };
		}
		this.removePlayer(connection);
		this.addSpectator(connection);
		this.sendStateToConnection(connection);
		return { success: true };
	}

	removePlayer(connection) {
		// Remove from player slot
		if (this.player1.connection === connection) {
			this.player1.connection = null;
			this.player1.ready = false;
			this.player1.name = null;
			connection.playerId = null;
		} else if (this.player2.connection === connection) {
			this.player2.connection = null;
			this.player2.ready = false;
			this.player2.name = null;
			connection.playerId = null;
		}

		// Stop game if a player leaves
		if (this.gameLoopTimeout) {
			clearTimeout(this.gameLoopTimeout);
			this.gameLoopTimeout = null;
		}
		this.running = false;
		this.loaded = false;
		this.startingRound = false;
		this.resetGameState();

		// Return true if room is now empty
		return !this.player1.connection && !this.player2.connection;
	}

	removeSpectator(connection) {
		this.spectators.delete(connection);
		if (connection.role === "spectator") {
			connection.playerId = null;
		}
	}

	isEmpty() {
		return (
			!this.player1.connection &&
			!this.player2.connection &&
			this.spectators.size === 0
		);
	}

	resetGameState() {
		this.initializeBall();
		this.resetPlayerState(this.player1, GAME_CONSTANTS.PLAYER1_Z);
		this.resetPlayerState(this.player2, GAME_CONSTANTS.PLAYER2_Z);

		this.running = false;
		this.loaded = false;
		this.startingRound = false;

		this.resetSpellState();
		this.resetSpells();

		this.broadcastSpellReset();
		this.broadcastState();
	}

	// Broadcast SPELL_SWITCHED for all 4 spells (both players) to all connections
	// Called after spell types are reset to defaults so all clients recreate correct spell objects
	broadcastSpellReset() {
		this.broadcastSpellSwitched(1, true, this.player1.currentOffensiveSpell);
		this.broadcastSpellSwitched(1, false, this.player1.currentCounterSpell);
		this.broadcastSpellSwitched(2, true, this.player2.currentOffensiveSpell);
		this.broadcastSpellSwitched(2, false, this.player2.currentCounterSpell);
	}

	resetPlayerState(player, zPosition) {
		this.resetPlayerPositions(player, zPosition);
		player.score = 0;
	}

	resetPlayerPositions(player, zPosition) {
		player.x = 0;
		player.z = zPosition;
		player.currSpeed = 0;
		player.currDirection = 0;
		player.maxSpeed = GAME_CONSTANTS.PADDLE_MAX_SPEED;
		player.drag = GAME_CONSTANTS.PADDLE_DRAG;
		player.direction = 0;
		player.inputDirection = 0;
		player.failed = false;
		player.ready = false;
		player.size = GAME_CONSTANTS.PADDLE_SIZE;

		player.currentOffensiveSpell = "ballAngleSwitch";
		player.currentCounterSpell = "ballStop";
		player.spells = {
			counter: { active: false, cooldown: 0 },
			offensive: { active: false, cooldown: 0 },
		};
	}

	updatePlayerSpell(playerID, offensive) {
		const player = playerID === 1 ? this.player1 : this.player2;
		let currentSpell = offensive
			? player.currentOffensiveSpell
			: player.currentCounterSpell;

		// Cycle to the next spell
		const cycle = offensive ? spellCycles.offensive : spellCycles.counter;
		const currentIndex = cycle.indexOf(currentSpell);
		const nextIndex = (currentIndex + 1) % cycle.length;
		offensive
			? (player.currentOffensiveSpell = cycle[nextIndex])
			: (player.currentCounterSpell = cycle[nextIndex]);

		// Broadcast the spell change to the other player
		this.broadcastSpellSwitched(playerID, offensive, cycle[nextIndex]);
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
			if (!this.loaded) {
				return;
			}
			if (!this.player1.ready || !this.player2.ready) {
				return;
			} else if (!this.startingRound) {
				this.startingRound = true;
				setTimeout(() => {
					this.running = true;
					this.startingRound = false;
					this.resetSpells();
				}, GAME_CONSTANTS.ROUND_START_DELAY);
			}
			return;
		}

		// SPELL: BallAngleSwitch (reverse ball direction once)
		if (this._angleActive) {
			this._angleDuration = (this._angleDuration || 0) + delta * 1000;
			if (this._angleDuration >= 500) {
				this._angleActive = false;
				this._angleDuration = 0;
				this.broadcastSpellEndedIfNoneActive();
			}
		}
		// SPELL: BallShot (speed boost with duration)
		if (this._shotActive) {
			this._shotDuration = (this._shotDuration || 0) + delta * 1000;
			if (this._shotDuration >= 500) {
				this._shotActive = false;
				this._shotDuration = 0;
				this.broadcastSpellEndedIfNoneActive();
			}
		}

		// SPELL: BallBack (reverse ball direction once)
		if (this._backActive) {
			this._backDuration = (this._backDuration || 0) + delta * 1000;
			if (this._backDuration >= 500) {
				this._backActive = false;
				this._backDuration = 0;
				this.broadcastSpellEndedIfNoneActive();
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
				this.broadcastSpellEndedIfNoneActive();
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
				this.broadcastSpellEndedIfNoneActive();
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
				this.broadcastSpellEndedIfNoneActive();
			}
			this._portalLastXDir = Math.sign(this.ball.cos);
			this._portalLastZDir = Math.sign(this.ball.sin);
			this._portalDuration = (this._portalDuration || 0) + delta * 1000;
			if (this._portalDuration >= 500) {
				this._portalActive = false;
				this._portalDuration = 0;
				this._portalPlayer = null;
				this.broadcastSpellEndedIfNoneActive();
			}
		}

		// Update physics (skip ball update if stop spell is active)
		this.physics.updatePaddle(this.player1, delta);
		this.physics.updatePaddle(this.player2, delta);
		let event = null;
		if (!this._stopActive) {
			event = this.physics.updateBall(delta);
		}

		if (event) {
			if (event.type === "GAME_SCORE") {
				this.running = false;
				this.resetSpells();
				this.handleScoreEvent(event, true);

				// Check for game over
				if (this.player1.score >= GAME_CONSTANTS.MAX_ROUNDS || this.player2.score >= GAME_CONSTANTS.MAX_ROUNDS) {
					const player1Wins = this.player1.score >= GAME_CONSTANTS.MAX_ROUNDS;
					console.log(`[GAME OVER] Player1: ${this.player1.score}, Player2: ${this.player2.score}, MAX_ROUNDS: ${GAME_CONSTANTS.MAX_ROUNDS}, Winner: ${player1Wins ? 'Player1' : 'Player2'}`);

					// Report match result BEFORE demotion (needs userId from connection)
					this.reportMatchResult(player1Wins);

					// Send per-player GAME_OVER messages with scores
					this.handleGameOverEvent(player1Wins);

					// Reset player positions and spells but KEEP scores
					// so the winner and spectators can still see the final result.
					// Scores will be reset when a new player takes the seat.
					this.running = false;
					this.player1.ready = false;
					this.player2.ready = false;
					this.resetPlayerPositions(this.player1, GAME_CONSTANTS.PLAYER1_Z);
					this.resetPlayerPositions(this.player2, GAME_CONSTANTS.PLAYER2_Z);
					this.initializeBall();
					this.broadcastSpellReset();
				}
			} else {
				this.handleCollisionEvent(event, true);
			}
		}

		this.broadcastState();
	}

	handleCollisionEvent(collisionEvent, isPlayer1) {
		let player = isPlayer1 ? this.player1 : this.player2;
		let sign = isPlayer1 ? 1 : -1;
		if (player.connection) {
			try {
				player.connection.send(
					JSON.stringify({
						type: "COLLISION",
						x: collisionEvent.x * sign,
						z: collisionEvent.z * sign,
						speed: collisionEvent.speed * sign,
						angle: -collisionEvent.angle,
					}),
				);
			} catch (error) {
				console.error("Error sending COLLISION to player1:", error);
			}
		}
		if (!isPlayer1) return;
		this.handleCollisionEvent(collisionEvent, false);

		// Send to spectators from Player 1's perspective (sign = 1)
		const spectatorMessage = JSON.stringify({
			type: "COLLISION",
			x: collisionEvent.x,
			z: collisionEvent.z,
			speed: collisionEvent.speed,
			angle: -collisionEvent.angle,
		});
		for (const spectator of this.spectators) {
			try {
				spectator.send(spectatorMessage);
			} catch (error) {
				console.error("Error sending COLLISION to spectator:", error);
			}
		}
	}

	handleScoreEvent(scoreEvent, isPlayer1) {
		let player = isPlayer1 ? this.player1 : this.player2;

		if (player.connection) {
			try {
				player.connection.send(
					JSON.stringify({
						type: "GAME_SCORE",
						enemy: isPlayer1 ? !scoreEvent.player1Wins : scoreEvent.player1Wins,
						player1Score: isPlayer1 ? this.player1.score : this.player2.score,
						player2Score: isPlayer1 ? this.player2.score : this.player1.score,
					}),
				);
			} catch (error) {
				console.error("Error sending GAME_SCORE to player:", error);
			}
		}
		if (!isPlayer1) return;
		this.handleScoreEvent(scoreEvent, false);

		// Send to spectators from Player 1's perspective
		const spectatorMessage = JSON.stringify({
			type: "GAME_SCORE",
			enemy: !scoreEvent.player1Wins,
			player1Score: this.player1.score,
			player2Score: this.player2.score,
		});
		for (const spectator of this.spectators) {
			try {
				spectator.send(spectatorMessage);
			} catch (error) {
				console.error("Error sending GAME_SCORE to spectator:", error);
			}
		}
	}

	handleGameOverEvent(player1Wins) {
		// Send per-player GAME_OVER messages with flipped scores (like handleScoreEvent)
		const sendToPlayer = (isPlayer1) => {
			const player = isPlayer1 ? this.player1 : this.player2;
			const won = isPlayer1 ? player1Wins : !player1Wins;
			if (player.connection) {
				try {
					player.connection.send(
						JSON.stringify({
							type: "GAME_OVER",
							won: won,
							winner: player1Wins ? 1 : 2,
							player1Score: isPlayer1 ? this.player1.score : this.player2.score,
							player2Score: isPlayer1 ? this.player2.score : this.player1.score,
						}),
					);
				} catch (error) {
					console.error("Error sending GAME_OVER to player:", error);
				}
			}
		};

		sendToPlayer(true);
		sendToPlayer(false);

		// Also notify spectators
		for (const spectator of this.spectators) {
			try {
				spectator.send(
					JSON.stringify({
						type: "GAME_OVER",
						won: null,
						winner: player1Wins ? 1 : 2,
						player1Score: this.player1.score,
						player2Score: this.player2.score,
					}),
				);
			} catch (error) {
				console.error("Error sending GAME_OVER to spectator:", error);
			}
		}

		// Demote the loser to spectator (lightweight: just move connection, don't reset game)
		const loserPlayer = player1Wins ? this.player2 : this.player1;
		const loserConnection = loserPlayer.connection;
		if (loserConnection) {
			// Move connection from player slot to spectators
			loserPlayer.connection = null;
			loserPlayer.ready = false;
			loserPlayer.name = null;
			loserConnection.playerId = null;
			loserConnection.role = "spectator";
			this.spectators.add(loserConnection);
			this.sendStateToConnection(loserConnection);

			// Notify about seat availability
			this.broadcastEvent({
				type: "PLAYER_SEAT_AVAILABLE",
				seatsAvailable:
					(this.player1.connection ? 0 : 1) + (this.player2.connection ? 0 : 1),
			});
		}
	}

	getStateForPlayer(isPlayer1) {
		const now = performance.now();
		const me = isPlayer1 ? this.player1 : this.player2;
		const enemy = isPlayer1 ? this.player2 : this.player1;
		const abs = isPlayer1 ? 1 : -1;

		return {
			type: "GAME_STATE",
			ball: { x: this.ball.x * abs, z: this.ball.z * abs },
			player1: {
				x: me.x * abs,
				name: me.name,
				score: me.score,
				currentOffensiveSpell: me.currentOffensiveSpell,
				currentCounterSpell: me.currentCounterSpell,
				offensiveCooldownElapsed:
					SPELL_CONSTANTS[me.currentOffensiveSpell] -
					Math.max(0, me.spells.offensive.cooldown - now),
				counterCooldownElapsed:
					SPELL_CONSTANTS[me.currentCounterSpell] -
					Math.max(0, me.spells.counter.cooldown - now),
				offensiveSpellReady:
					Math.max(0, me.spells.offensive.cooldown - now) === 0,
				counterSpellReady: Math.max(0, me.spells.counter.cooldown - now) === 0,
			},
			player2: {
				x: enemy.x * abs,
				name: enemy.name,
				score: enemy.score,
				currentOffensiveSpell: enemy.currentOffensiveSpell,
				currentCounterSpell: enemy.currentCounterSpell,
				offensiveCooldownElapsed:
					SPELL_CONSTANTS[enemy.currentOffensiveSpell] -
					Math.max(0, enemy.spells.offensive.cooldown - now),
				counterCooldownElapsed:
					SPELL_CONSTANTS[enemy.currentCounterSpell] -
					Math.max(0, enemy.spells.counter.cooldown - now),
				offensiveSpellReady:
					Math.max(0, enemy.spells.offensive.cooldown - now) === 0,
				counterSpellReady:
					Math.max(0, enemy.spells.counter.cooldown - now) === 0,
			},
			running: this.running,
		};
	}

	getStateForSpectator() {
		return this.getStateForPlayer(true);
	}

	sendStateToConnection(connection) {
		let state = null;
		if (this.player1.connection === connection) {
			state = this.getStateForPlayer(true);
		} else if (this.player2.connection === connection) {
			state = this.getStateForPlayer(false);
		} else if (this.isSpectator(connection)) {
			state = this.getStateForSpectator();
		}

		if (!state) return;

		try {
			connection.send(JSON.stringify(state));
		} catch (error) {
			console.error("Error sending GAME_STATE to connection:", error);
		}
	}

	broadcastState() {
		// Send to both players
		if (this.player1.connection) {
			try {
				this.player1.connection.send(
					JSON.stringify(this.getStateForPlayer(true)),
				);
			} catch (error) {
				console.error("Error sending GAME_STATE to player1:", error);
			}
		}

		if (this.player2.connection) {
			try {
				this.player2.connection.send(
					JSON.stringify(this.getStateForPlayer(false)),
				);
			} catch (error) {
				console.error("Error sending GAME_STATE to player2:", error);
			}
		}

		for (const spectator of this.spectators) {
			try {
				spectator.send(JSON.stringify(this.getStateForSpectator()));
			} catch (error) {
				console.error("Error sending GAME_STATE to spectator:", error);
			}
		}
	}

	broadcastEvent(event) {
		const message = JSON.stringify(event);

		if (this.player1.connection) {
			try {
				this.player1.connection.send(message);
			} catch (error) {
				console.error("Error sending event to player1:", error);
			}
		}

		if (this.player2.connection) {
			try {
				this.player2.connection.send(message);
			} catch (error) {
				console.error("Error sending event to player2:", error);
			}
		}

		for (const spectator of this.spectators) {
			try {
				spectator.send(message);
			} catch (error) {
				console.error("Error sending event to spectator:", error);
			}
		}
	}

	broadcastEventToPlayers(event) {
		const message = JSON.stringify(event);

		if (this.player1.connection) {
			try {
				this.player1.connection.send(message);
			} catch (error) {
				console.error("Error sending event to player1:", error);
			}
		}

		if (this.player2.connection) {
			try {
				this.player2.connection.send(message);
			} catch (error) {
				console.error("Error sending event to player2:", error);
			}
		}
	}

	cleanup() {
		if (this.gameLoopTimeout) {
			clearTimeout(this.gameLoopTimeout);
			this.gameLoopTimeout = null;
		}
	}

	async reportMatchResult(player1Wins) {
		const player1UserId = this.player1.connection?.userId;
		const player2UserId = this.player2.connection?.userId;
		const p1Score = this.player1.score;
		const p2Score = this.player2.score;

		console.log(`[MATCH REPORT] Attempting to report match: p1=${player1UserId} (${p1Score}) vs p2=${player2UserId} (${p2Score}), winner=${player1Wins ? 'p1' : 'p2'}`);

		// At least one player must be authenticated to record the match
		if (!player1UserId && !player2UserId) {
			console.log("[MATCH REPORT] Skipping: no players are authenticated");
			return;
		}

		const USERS_BACKEND_URL = process.env.USERS_BACKEND_URL;
		if (!USERS_BACKEND_URL) {
			console.error("[MATCH REPORT] USERS_BACKEND_URL not configured");
			return;
		}

		const winnerId = player1Wins ? player1UserId : player2UserId;

		const body = {
			player1_id: player1UserId || null,
			player2_id: player2UserId || null,
			player1_score: p1Score,
			player2_score: p2Score,
			winner_id: winnerId || null,
		};
		console.log("[MATCH REPORT] Sending:", JSON.stringify(body));

		try {
			const response = await fetch(`${USERS_BACKEND_URL}/matches`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				console.error(`[MATCH REPORT] Failed: ${response.status} ${text}`);
			} else {
				console.log("[MATCH REPORT] Match result reported successfully");
			}
		} catch (error) {
			console.error("[MATCH REPORT] Error:", error);
		}
	}

	resetSpells() {
		const now = performance.now();
		this.player1.spells.offensive.cooldown =
			now + SPELL_CONSTANTS[this.player1.currentOffensiveSpell];
		this.player1.spells.counter.cooldown =
			now + SPELL_CONSTANTS[this.player1.currentCounterSpell];
		this.player2.spells.offensive.cooldown =
			now + SPELL_CONSTANTS[this.player2.currentOffensiveSpell];
		this.player2.spells.counter.cooldown =
			now + SPELL_CONSTANTS[this.player2.currentCounterSpell];
	}

	resetSpellState() {
		this._angleActive = false;
		this._shotActive = false;
		this._backActive = false;
		this._stopActive = false;
		this._imanActive = false;
		this._portalActive = false;

		this._angleDuration = 0;
		this._shotDuration = 0;
		this._backDuration = 0;
		this._stopDuration = 0;
		this._imanDuration = 0;
		this._portalDuration = 0;

		this._imanPlayer = null;
		this._portalPlayer = null;
		this._portalLastXDir = 0;
		this._portalLastZDir = 0;
		this._stopOriginalPosition = null;
	}

	isAnySpellActive() {
		return (
			this._angleActive ||
			this._shotActive ||
			this._backActive ||
			this._stopActive ||
			this._imanActive ||
			this._portalActive
		);
	}

	broadcastSpellEndedIfNoneActive() {
		if (!this.isAnySpellActive()) {
			this.broadcastEvent({ type: "SPELL_ENDED" });
		}
	}
}

class GameRoomManager {
	constructor() {
		this.rooms = new Map();
		this.waitingPlayers = [];
		this.activeUsers = new Map();
	}

	getActiveUserConnection(userId) {
		return this.activeUsers.get(userId) || null;
	}

	registerUserConnection(userId, connection, roomId) {
		this.activeUsers.set(userId, { connection, roomId });
	}

	updateUserRoom(userId, connection, roomId) {
		const active = this.activeUsers.get(userId);
		if (active && active.connection === connection) {
			active.roomId = roomId;
		}
	}

	clearUserConnection(userId, connection) {
		const active = this.activeUsers.get(userId);
		if (active && active.connection === connection) {
			this.activeUsers.delete(userId);
		}
	}

	findOrCreateRoom(connection, playerData) {
		// Always join as spectator first
		for (const [roomId, room] of this.rooms) {
			const result = room.addSpectator(connection);
			if (result.success) {
				return { room, playerId: null, role: "spectator" };
			}
		}

		// Create a new room and join as spectator
		const roomId = this.generateRoomId();
		const room = new GameRoom(roomId);
		this.rooms.set(roomId, room);

		room.addSpectator(connection);
		return { room, playerId: null, role: "spectator" };
	}

	removeConnectionFromRoom(connection) {
		for (const [roomId, room] of this.rooms) {
			if (
				room.player1.connection === connection ||
				room.player2.connection === connection
			) {
				room.removePlayer(connection);
				if (room.isEmpty()) {
					room.cleanup();
					this.rooms.delete(roomId);
				}

				return;
			}

			if (room.isSpectator(connection)) {
				room.removeSpectator(connection);
				if (room.isEmpty()) {
					room.cleanup();
					this.rooms.delete(roomId);
				}
				return;
			}
		}
	}

	generateRoomId() {
		const adjectives = [
			"ancient", "blazing", "cosmic", "dark", "epic", "fierce", "golden",
			"hidden", "iron", "jade", "keen", "lunar", "mystic", "neon", "obsidian",
			"phantom", "quantum", "rogue", "shadow", "thunder", "ultra", "venom",
			"wicked", "xenon", "yonder", "zero", "arcane", "brave", "chrome",
			"dire", "ember", "frozen", "grim", "hollow", "ivory", "jolly",
			"knightly", "lost", "molten", "noble", "onyx", "primal", "quick",
			"radiant", "steel", "toxic", "undying", "vivid", "wild", "astral",
		];
		const nouns = [
			"arena", "blade", "comet", "dragon", "forge", "ghost", "hawk",
			"inferno", "knight", "lion", "meteor", "nexus", "oracle", "phoenix",
			"quest", "raven", "storm", "titan", "vortex", "wolf", "archer",
			"bastion", "cipher", "dagger", "eclipse", "falcon", "golem", "hydra",
			"imp", "jester", "kraken", "lancer", "mantis", "nomad", "ogre",
			"panda", "quasar", "reaper", "serpent", "thorn", "umbra", "valkyrie",
			"warden", "wyrm", "yeti", "zenith", "bolt", "claw", "drift",
		];
		const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
		const noun = nouns[Math.floor(Math.random() * nouns.length)];
		const num = Math.floor(Math.random() * 100);
		const id = `${adj}-${noun}-${num}`;
		// Ensure uniqueness
		if (this.rooms.has(id)) {
			return this.generateRoomId();
		}
		return id;
	}

	getRoomForConnection(connection) {
		for (const room of this.rooms.values()) {
			if (
				room.player1.connection === connection ||
				room.player2.connection === connection
			) {
				return room;
			}
			if (room.isSpectator(connection)) {
				return room;
			}
		}
		return null;
	}
}

module.exports = { GameRoom, GameRoomManager };
