// WebSocket route for Pong multiplayer game
const { GameRoomManager, GameRoom } = require("../../src/game");

const USERS_BACKEND_URL = process.env.USERS_BACKEND_URL;

// --- WebSocket heartbeat configuration ---
const PING_INTERVAL = 30000; // Send ping every 30 seconds; terminate if previous ping unanswered

// --- Guest identity generation ---

const GUEST_ADJECTIVES = [
	"Shadow", "Mystic", "Cosmic", "Phantom", "Arcane",
	"Storm", "Neon", "Pixel", "Cyber", "Void",
	"Crystal", "Ember", "Frost", "Thunder", "Solar",
	"Lunar", "Iron", "Golden", "Silent", "Swift",
];

const GUEST_NOUNS = [
	"Phoenix", "Dragon", "Wizard", "Knight", "Rogue",
	"Warlock", "Serpent", "Falcon", "Wolf", "Raven",
	"Titan", "Sphinx", "Golem", "Griffin", "Specter",
	"Viper", "Hawk", "Panther", "Jaguar", "Lynx",
];

function generateGuestName() {
	const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
	const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)];
	const num = Math.floor(Math.random() * 100);
	return `${adj}${noun}${num}`;
}

function generateGuestAvatar(name) {
	// Simple hash from the name to derive deterministic colors
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
	}
	const hue = Math.abs(hash) % 360;
	const bg = `hsl(${hue}, 60%, 30%)`;
	const fg = `hsl(${(hue + 140) % 360}, 70%, 70%)`;
	const initials = name.replace(/[0-9]/g, "").slice(0, 2).toUpperCase();

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
		<rect width="128" height="128" fill="${bg}" rx="8"/>
		<text x="64" y="72" font-family="monospace" font-size="48" font-weight="bold"
			  fill="${fg}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
	</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// --- End guest identity generation ---

async function resolveUserIdFromSession(req) {
	const cookie = req.headers?.cookie;
	if (!cookie) return null;
	try {
		const response = await fetch(`${USERS_BACKEND_URL}/me/profile`, {
			headers: {
				cookie,
			},
		});
		if (!response.ok) {
			return null;
		}
		const profile = await response.json();
		const userId = profile?.user_id || profile?.userId || profile?.id || null;
		const displayName = profile?.display_name || profile?.displayName || null;

		// Fetch the user's avatar from the users backend
		let avatar = null;
		if (userId) {
			try {
				const dashResponse = await fetch(`${USERS_BACKEND_URL}/dashboard`, {
					headers: { cookie },
				});
				if (dashResponse.ok) {
					const userData = await dashResponse.json();
					avatar = userData?.user?.avatar || null;
				}
			} catch (err) {
				console.error("Error fetching user avatar:", err);
			}
		}

		return { id: userId, displayName, avatar };
	} catch (error) {
		console.error("Error resolving user session:", error);
		return null;
	}
}

// Global room manager
const roomManager = new GameRoomManager();
roomManager.onRoomChanged = () => broadcastRoomList();

// --- WebSocket infrastructure for room list updates ---
const lobbyClients = new Set();
// Track all game connections for heartbeat
const gameClients = new Set();

function serializeRooms() {
	return Array.from(roomManager.rooms.values()).map((room) => ({
		id: room.roomId,
		players:
			(room.player1.connection ? 1 : 0) + (room.player2.connection ? 1 : 0),
		spectators: room.spectators.size,
		running: room.running,
		score: {
			player1: room.player1.score,
			player2: room.player2.score,
		},
	}));
}

function broadcastRoomList() {
	if (lobbyClients.size === 0) return;
	const msg = JSON.stringify({ type: "ROOM_LIST", rooms: serializeRooms() });
	for (const ws of lobbyClients) {
		if (ws.readyState === 1) { // WebSocket.OPEN
			ws.send(msg);
		} else {
			lobbyClients.delete(ws);
		}
	}
}
// --- End lobby WebSocket infrastructure ---

// --- WebSocket heartbeat ---
// Ping all connected WebSocket clients periodically.
// If a client doesn't respond with pong within PONG_TIMEOUT, terminate it.
const heartbeatInterval = setInterval(() => {
	for (const ws of gameClients) {
		if (ws._pongPending) {
			// Previous ping was never answered — connection is dead
			ws.terminate();
			gameClients.delete(ws);
			continue;
		}
		ws._pongPending = true;
		try { ws.ping(); } catch { /* ignore send errors */ }
	}
	for (const ws of lobbyClients) {
		if (ws._pongPending) {
			ws.terminate();
			lobbyClients.delete(ws);
			continue;
		}
		ws._pongPending = true;
		try { ws.ping(); } catch { /* ignore send errors */ }
	}
}, PING_INTERVAL);

// Prevent the interval from keeping the process alive on shutdown
if (heartbeatInterval.unref) heartbeatInterval.unref();
// --- End WebSocket heartbeat ---

module.exports = async function (fastify, opts) {
	// WebSocket endpoint for Pong game
	fastify.get("/", { websocket: true }, (connection, req) => {
		let currentRoom = null;
		let playerId = null;
		let playerName = null;
		let kickedPreviousSession = false;

		// Register for heartbeat tracking
		gameClients.add(connection);
		connection._pongPending = false;
		connection.on("pong", () => { connection._pongPending = false; });

		const getSeatsAvailable = (room) =>
			(room.player1.connection ? 0 : 1) + (room.player2.connection ? 0 : 1);
		const isRoomFull = (room) =>
			room.player1.connection && room.player2.connection;
		const notifySeatAvailability = (room) => {
			room.broadcastEvent({
				type: "PLAYER_SEAT_AVAILABLE",
				seatsAvailable: getSeatsAvailable(room),
			});
		};
		const notifyGameReadyIfFull = (room) => {
			if (isRoomFull(room)) {
				room.broadcastEvent({ type: "GAME_READY" });
			} else {
				notifySeatAvailability(room);
			}
		};
		const sendReadyStatusToConnection = (room, connection) => {
			const sendStatus = (playerId, ready) => {
				try {
					connection.send(
						JSON.stringify({
							type: "PLAYER_READY_STATUS",
							playerId,
							ready,
						}),
					);
				} catch (error) {
					console.error("Error sending ready status:", error);
				}
			};
			sendStatus(1, !!room.player1.ready);
			sendStatus(2, !!room.player2.ready);
		};
		const broadcastReadyStatus = (room) => {
			room.broadcastEvent({
				type: "PLAYER_READY_STATUS",
				playerId: 1,
				ready: !!room.player1.ready,
			});
			room.broadcastEvent({
				type: "PLAYER_READY_STATUS",
				playerId: 2,
				ready: !!room.player2.ready,
			});
		};

		// Handle incoming messages from client
		const getRequestedRoomId = () => {
			const roomId = req.query?.roomId;
			if (typeof roomId === "string" && roomId.trim() !== "") {
				return roomId;
			}
			return null;
		};

		connection.on("message", async (message) => {
			try {
				const data = JSON.parse(message.toString());
				const player =
					connection.playerId === 1
						? currentRoom?.player1
						: connection.playerId === 2
							? currentRoom?.player2
							: null;
				switch (data.type) {
					case "JOIN_GAME": {
						if (!connection.userId) {
							const session = await resolveUserIdFromSession(req);
							connection.userId = session?.id || null;
							connection.userName = session?.displayName || null;
							connection.userAvatar = session?.avatar || null;
						}

						// Generate guest identity for unauthenticated users
						if (!connection.userId && !connection.userName) {
							connection.userName = generateGuestName();
							connection.userAvatar = generateGuestAvatar(connection.userName);
							connection.isGuest = true;
						}

						kickedPreviousSession = false;
						if (connection.userId) {
							const active = roomManager.getActiveUserConnection(
								connection.userId,
							);
							if (active && active.connection !== connection) {
								try {
									active.connection.send(
										JSON.stringify({
											type: "SESSION_REPLACED",
										}),
									);
								} catch (error) {
									console.error(
										"Error notifying replaced session:",
										error,
									);
								}
								roomManager.removeConnectionFromRoom(active.connection);
								try {
									active.connection.close();
								} catch (error) {
									console.error(
										"Error closing replaced session:",
										error,
									);
								}
								kickedPreviousSession = true;
							}
						}
						let role = "spectator";
						let assignedPlayerId = null;
						const requestedRoomId = getRequestedRoomId();
						if (requestedRoomId) {
							const requestedRoom = roomManager.rooms.get(requestedRoomId);
							if (requestedRoom) {
								requestedRoom.addSpectator(connection);
								currentRoom = requestedRoom;
								playerId = null;
							} else {
								connection.send(
									JSON.stringify({
										type: "ROOM_NOT_FOUND",
										roomId: requestedRoomId,
									}),
								);
								connection.close();
								return;
							}
						} else {
							// Find or create a room for this player
							const result = roomManager.findOrCreateRoom(
								connection,
								data.playerData || {},
							);
							currentRoom = result.room;
							playerId = result.playerId;
							role = result.role;
							assignedPlayerId = result.playerId;
						}
						playerName =
							connection.userName ||
							(data.playerData && data.playerData.name
								? data.playerData.name
								: `Player${playerId}`);
						console.log(
							`Connected: id=${playerId}, name=${playerName}, room=${currentRoom.roomId}`,
						);

						if (connection.userId) {
							roomManager.registerUserConnection(
								connection.userId,
								connection,
								currentRoom.roomId,
							);
						}

						// Send confirmation to client
						const isPlayer1 = assignedPlayerId === 1;
						connection.send(
							JSON.stringify({
								type: "GAME_JOINED",
								roomId: currentRoom.roomId,
								role: role,
								playerId: assignedPlayerId,
								playerName: isPlayer1
									? (currentRoom.player1?.name || null)
									: (currentRoom.player2?.name || null),
								opponentName: isPlayer1
									? (currentRoom.player2?.name || null)
									: (currentRoom.player1?.name || null),
								seatsAvailable: getSeatsAvailable(currentRoom),
								alone: !isRoomFull(currentRoom),
								sessionReplaced: kickedPreviousSession,
							}),
						);

						currentRoom.sendStateToConnection(connection);
						sendReadyStatusToConnection(currentRoom, connection);
						notifyGameReadyIfFull(currentRoom);
						currentRoom.broadcastRoomUsers();
						broadcastRoomList();

						break;
					}

					case "PLAYER_DIRECTION":
						// Handle player input
						if (currentRoom && player) {
							player.inputDirection =
								connection.playerId === 2 ? -data.direction : data.direction;
						}
						break;

					case "PLAYER_READY":
						// Player is ready to start or spectator requests seat
						if (currentRoom) {
							if (!player && connection.role === "spectator") {
								const promotion = currentRoom.promoteSpectator(connection);
								if (promotion.success) {
									playerId = promotion.playerId;
									const promotedPlayer =
										promotion.playerId === 1
											? currentRoom.player1
											: currentRoom.player2;
									promotedPlayer.ready = false;
									connection.role = "player";
								const isPromotedPlayer1 = promotion.playerId === 1;
								connection.send(
									JSON.stringify({
										type: "PLAYER_PROMOTED",
										playerId: promotion.playerId,
										roomId: currentRoom.roomId,
										playerName: isPromotedPlayer1
											? (currentRoom.player1?.name || null)
											: (currentRoom.player2?.name || null),
										opponentName: isPromotedPlayer1
											? (currentRoom.player2?.name || null)
											: (currentRoom.player1?.name || null),
									}),
								);
									currentRoom.sendStateToConnection(connection);
									sendReadyStatusToConnection(currentRoom, connection);
									broadcastReadyStatus(currentRoom);
									notifySeatAvailability(currentRoom);
									if (isRoomFull(currentRoom)) {
								currentRoom.broadcastEvent({
										type: "GAME_READY",
									});
									if (
										currentRoom.player1.ready &&
										currentRoom.player2.ready
									) {
										currentRoom.broadcastEvent({
											type: "GAME_START",
										});
									}
								}
								currentRoom.broadcastRoomUsers();
								broadcastRoomList();
								} else {
									connection.send(
										JSON.stringify({
											type: "PLAYER_SEAT_UNAVAILABLE",
										}),
									);
								}
							} else if (player) {
								player.ready = true;
								currentRoom.broadcastEvent({
									type: "PLAYER_READY_STATUS",
									playerId: connection.playerId,
									ready: true,
								});
							// Check if both players are ready
								if (currentRoom.player1.ready && currentRoom.player2.ready) {
									currentRoom.broadcastEvent({
										type: "GAME_START",
									});
								}
							}
						}
						if (currentRoom && connection.userId) {
							roomManager.updateUserRoom(
								connection.userId,
								connection,
								currentRoom.roomId,
							);
						}
						break;

					case "USE_SPELL":
						// Handle spell activation
						if (currentRoom && player) {
							currentRoom.useSpell(player, data.offensive);
						}
						break;

					case "SWITCH_SPELL":
						if (currentRoom && player) {
							currentRoom.updatePlayerSpell(
								connection.playerId,
								data.offensive,
							);
						}
						break;

					case "BECOME_SPECTATOR":
						if (currentRoom && connection.role === "player") {
							currentRoom.player1.ready = false;
							currentRoom.player2.ready = false;
							currentRoom.demotePlayerToSpectator(connection);
							notifySeatAvailability(currentRoom);
							currentRoom.broadcastEvent({
								type: "PLAYER_DISCONNECTED",
							});
							currentRoom.broadcastEvent({
								type: "PLAYER_READY_STATUS",
								playerId: 1,
								ready: false,
							});
							currentRoom.broadcastEvent({
								type: "PLAYER_READY_STATUS",
								playerId: 2,
								ready: false,
							});
							currentRoom.broadcastRoomUsers();
							broadcastRoomList();
						}
						break;

					case "CHAT_MESSAGE": {
						if (currentRoom && data.content) {
							const chatMsg = currentRoom.addChatMessage(connection, data.content);
							if (chatMsg) {
								currentRoom.broadcastChatMessage(chatMsg);
							}
						}
						break;
					}

					default:
						console.log("Unknown message type:", data.type);
				}
			} catch (error) {
				console.error("Error handling message:", error);
				connection.send(
					JSON.stringify({
						type: "ERROR",
						message: "Invalid message format",
					}),
				);
			}
		});

		// Handle connection close
		connection.on("close", () => {
			gameClients.delete(connection);
			console.log(
				`Disconnected: id=${playerId || "?"}, name=${playerName || "?"}, room=${
					currentRoom ? currentRoom.roomId : "?"
				}`,
			);

			const wasPlayer = connection.role === "player";
			roomManager.removeConnectionFromRoom(connection);
			if (connection.userId) {
				roomManager.clearUserConnection(connection.userId, connection);
			}

			if (currentRoom && wasPlayer) {
				// Notify other player/spectators
				currentRoom.broadcastEvent({
					type: "PLAYER_DISCONNECTED",
				});
				notifySeatAvailability(currentRoom);
			}
			if (currentRoom && !currentRoom.isEmpty()) {
				currentRoom.broadcastRoomUsers();
			}
			broadcastRoomList();
		});

		// Handle errors
		connection.on("error", (error) => {
			console.error("WebSocket error:", error);
		});
	});

	// REST endpoint to get server stats (optional, for debugging)
	fastify.get("/stats", async (request, reply) => {
		return {
			activeRooms: roomManager.rooms.size,
			totalPlayers: Array.from(roomManager.rooms.values()).reduce(
				(sum, room) =>
					sum +
					(room.player1.connection ? 1 : 0) +
					(room.player2.connection ? 1 : 0),
				0,
			),
			rooms: Array.from(roomManager.rooms.values()).map((room) => ({
				id: room.roomId,
				players:
					(room.player1.connection ? 1 : 0) + (room.player2.connection ? 1 : 0),
				spectators: room.spectators.size,
				running: room.running,
				score: {
					player1: room.player1.score,
					player2: room.player2.score,
				},
			})),
		};
	});

	// REST endpoint to list rooms for UI
	fastify.get("/rooms", async (request, reply) => {
		return serializeRooms();
	});

	// WebSocket endpoint for real-time room list updates (lobby)
	fastify.get("/rooms/ws", { websocket: true }, (connection, req) => {
		lobbyClients.add(connection);
		connection._pongPending = false;
		connection.on("pong", () => { connection._pongPending = false; });
		console.log(`[lobby] client connected (total: ${lobbyClients.size})`);

		// Send current room list immediately
		connection.send(JSON.stringify({ type: "ROOM_LIST", rooms: serializeRooms() }));

		connection.on("close", () => {
			lobbyClients.delete(connection);
			console.log(`[lobby] client disconnected (total: ${lobbyClients.size})`);
		});

		connection.on("error", () => {
			lobbyClients.delete(connection);
		});
	});

	// REST endpoint to create a room
	fastify.post("/rooms", async (request, reply) => {
		const roomId = roomManager.generateRoomId();
		const room = new GameRoom(roomId);
		room.onRunningChanged = broadcastRoomList;
		roomManager.rooms.set(roomId, room);
		broadcastRoomList();
		return { id: roomId };
	});

	// REST endpoint to get connected users in a room (players + spectators)
	fastify.get("/rooms/:roomId/users", async (request, reply) => {
		const room = roomManager.rooms.get(request.params.roomId);
		if (!room) {
			return reply.code(404).send({ error: "Room not found" });
		}

		return room.getRoomUsers();
	});

	// REST endpoint to get chat history for a room
	fastify.get("/rooms/:roomId/chat", async (request, reply) => {
		const room = roomManager.rooms.get(request.params.roomId);
		if (!room) {
			return reply.code(404).send({ error: "Room not found" });
		}
		return room.getChatHistory();
	});
};
