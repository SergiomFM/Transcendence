import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import type { WebSocket } from "@fastify/websocket";
import { findOrCreateUser, createMessage } from "./messages.ts";

const prisma = new PrismaClient();


// Map username → WebSocket connection
const connectionsMap: Map<string, WebSocket> = new Map();

export async function webSocketsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { username: string } }>(
    "/chat/:username",
    { websocket: true },
    async (connection, req) => {
      const username = req.params.username;

      if (!username) {
        connection.close();
        return;
      }

      // Ensure the chat user record exists
      const user = await findOrCreateUser(username);

      // Register connection
      connectionsMap.set(username, connection);
      console.log(`[chat] ${username} connected (total: ${connectionsMap.size})`);

      // Send current online users to the new connection
      connection.send(
        JSON.stringify({
          type: "online_users",
          users: Array.from(connectionsMap.keys()),
        }),
      );

      // Notify all others that this user is now online
      for (const [otherUsername, socket] of connectionsMap.entries()) {
        if (otherUsername !== username && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ type: "user_online", username }),
          );
        }
      }

      // Handle incoming messages
      connection.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());

          if (payload.type === "message") {
            const { to, content } = payload;
            if (!to || !content?.trim()) return;

            // Find or create receiver
            const receiver = await prisma.user.findUnique({
              where: { username: to },
            });
            if (!receiver) {
              connection.send(
                JSON.stringify({ type: "error", message: `User '${to}' not found` }),
              );
              return;
            }

            // Persist message
            const message = await createMessage(user, receiver, content.trim());
            if (!message) return;

            const outgoing = {
              type: "message",
              id: message.id,
              from: username,
              to,
              content: message.content,
              timestamp: message.createdAt,
            };

            // Echo back to sender so they see their own message confirmed
            connection.send(JSON.stringify({ ...outgoing, self: true }));

            // Forward to receiver if online
            const receiverSocket = connectionsMap.get(to);
            if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
              receiverSocket.send(JSON.stringify({ ...outgoing, self: false }));
            }
          } else if (payload.type === "game_invite") {
            // Ephemeral game invite — not persisted, just forwarded
            const { to, roomId } = payload;
            if (!to || !roomId) return;

            const outgoing = {
              type: "game_invite",
              from: username,
              to,
              roomId,
              timestamp: new Date().toISOString(),
            };

            // Echo back to sender for confirmation
            connection.send(JSON.stringify({ ...outgoing, self: true }));

            // Forward to receiver if online
            const receiverSocket = connectionsMap.get(to);
            if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
              receiverSocket.send(JSON.stringify({ ...outgoing, self: false }));
            }
          }
        } catch (err) {
          console.error("[chat] ws message error:", err);
        }
      });

      // Handle disconnect
      connection.on("close", () => {
        connectionsMap.delete(username);
        console.log(`[chat] ${username} disconnected (total: ${connectionsMap.size})`);

        // Notify others that user went offline
        for (const [, socket] of connectionsMap.entries()) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "user_offline", username }));
          }
        }
      });
    },
  );
}
