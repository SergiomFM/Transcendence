// WebSocket route for Pong multiplayer game
const { GameRoomManager } = require("../../src/game");

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
        const player =
          connection.playerId === 1
            ? currentRoom?.player1
            : currentRoom?.player2;
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
                type: "GAME_JOINED",
                roomId: currentRoom.roomId,
                alone:
                  !currentRoom.player1.connection ||
                  !currentRoom.player2.connection
                    ? true
                    : false,
              }),
            );

            // Notify when room is full and game can start
            if (
              currentRoom.player1.connection &&
              currentRoom.player2.connection
            ) {
              currentRoom.broadcastEvent({
                type: "GAME_READY",
              });
            }

            break;
          }

          case "PLAYER_DIRECTION":
            // Handle player input
            if (currentRoom) {
              player.inputDirection =
                connection.playerId === 2 ? -data.direction : data.direction;
            }
            break;

          case "PLAYER_READY":
            // Player is ready to start
            if (currentRoom) {
              player.ready = true;
              // Check if both players are ready
              if (currentRoom.player1.ready && currentRoom.player2.ready) {
                currentRoom.broadcastEvent({
                  type: "GAME_START",
                });
              }
            }
            break;

          case "USE_DASH":
            // Handle dash activation
            if (currentRoom && player.dashReady) {
              player.dashActive = true;
            }
            break;

          case "USE_SPELL":
            // Handle spell activation
            if (currentRoom && player) {
              currentRoom.useSpell(player, data.offensive);
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
      console.log(
        `Disconnected: id=${playerId || "?"}, name=${playerName || "?"}, room=${
          currentRoom ? currentRoom.roomId : "?"
        }`,
      );

      roomManager.removePlayerFromRoom(connection);

      if (currentRoom) {
        // Notify other player
        currentRoom.broadcastEvent({
          type: "PLAYER_DISCONNECTED",
        });
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
        running: room.running,
        score: {
          player1: room.player1.score,
          player2: room.player2.score,
        },
      })),
    };
  });
};
