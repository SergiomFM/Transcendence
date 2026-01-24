// WebSocket route for Pong multiplayer game
const { GameRoomManager } = require("../../shared/gameState");
const { spellTypes } = require("../../shared/constants");

// Global room manager
const roomManager = new GameRoomManager();

module.exports = async function (fastify, opts) {
  // WebSocket endpoint for Pong game
  fastify.get("/", { websocket: true }, (connection, req) => {
    let currentRoom = null;
    let playerId = null;
    let playerName = null;

    // Handle incoming messages from client
    connection.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "JOIN_GAME": {
            // Find or create a room for this player
            const result = roomManager.findOrCreateRoom(
              connection,
              data.playerData || {},
            );
            currentRoom = result.room;
            playerId = result.playerId;
            playerName =
              data.playerData && data.playerData.name
                ? data.playerData.name
                : `Player${playerId}`;

            console.log(
              `Connected: id=${playerId}, name=${playerName}, room=${currentRoom.roomId}`,
            );

            // Send confirmation to client
            connection.send(
              JSON.stringify({
                type: "JOINED_GAME",
                playerId: playerId,
                roomId: currentRoom.roomId,
                playerCount: currentRoom.players.size,
                maxPlayers: currentRoom.maxPlayers,
              }),
            );

            // Notify when room is full and game can start
            if (currentRoom.players.size === currentRoom.maxPlayers) {
              currentRoom.broadcastEvent({
                type: "GAME_READY",
                message: "Both players connected. Press SPACE to start!",
              });
            } else {
              connection.send(
                JSON.stringify({
                  type: "WAITING",
                  message: "Waiting for opponent...",
                }),
              );
            }
            break;
          }

          case "INPUT":
            // Handle player input
            if (currentRoom) {
              currentRoom.handlePlayerInput(connection, data.input);
            }
            break;

          case "READY":
            // Player is ready to start
            if (currentRoom) {
              currentRoom.handlePlayerInput(connection, { ready: true });

              // Check if both players are ready
              if (currentRoom.player1.ready && currentRoom.player2.ready) {
                currentRoom.broadcastEvent({
                  type: "GAME_START",
                  message: "Game starting!",
                });
              }
            }
            break;

          case "DASH":
            // Handle dash activation
            if (currentRoom) {
              currentRoom.handlePlayerInput(connection, { dash: true });
            }
            break;

          case "USE_SPELL":
            // Handle spell activation
            if (currentRoom) {
              currentRoom.handlePlayerInput(connection, {
                useSpell: data.offensive,
              });
            }
            break;

          case "SWITCH_SPELL":
            if (currentRoom) {
              currentRoom.updatePlayerSpell(
                connection.playerId,
                data.offensive,
              );
            }
            break;

          case "PLAYER_DIRECTION":
            // Handle player direction input
            if (currentRoom) {
              currentRoom.handlePlayerInput(connection, {
                direction: data.direction,
              });
            }
            break;

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
      // Try to get playerId and name from room if not set
      if ((!playerId || !playerName) && currentRoom && currentRoom.players) {
        const player = currentRoom.players.get(connection);
        if (player) {
          playerId = player.id;
          playerName = player.name || `Player${playerId}`;
        }
      }
      console.log(
        `Disconnected: id=${playerId || "?"}, name=${playerName || "?"}, room=${
          currentRoom ? currentRoom.roomId : "?"
        }`,
      );

      if (currentRoom) {
        // Notify other player
        currentRoom.broadcastEvent({
          type: "PLAYER_DISCONNECTED",
          message: "Opponent disconnected",
        });

        // Remove player from room
        roomManager.removePlayerFromRoom(connection);
      }
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
        (sum, room) => sum + room.players.size,
        0,
      ),
      rooms: Array.from(roomManager.rooms.values()).map((room) => ({
        id: room.roomId,
        players: room.players.size,
        running: room.running,
        score: {
          player1: room.player1.score,
          player2: room.player2.score,
        },
      })),
    };
  });
};
