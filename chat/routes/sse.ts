import type { FastifyInstance, FastifyReply } from "fastify";
import { findOrCreateUser, getUnreadSummary, getPendingGameInvites } from "./messages.ts";

// Map username → SSE reply stream
const connectionsMap: Map<string, FastifyReply> = new Map();

/** Send an SSE event to a specific reply stream */
function sendSSE(reply: FastifyReply, event: string, data: unknown) {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Broadcast an event to all connected users except the sender */
function broadcastExcept(senderUsername: string, event: string, data: unknown) {
  for (const [username, reply] of connectionsMap.entries()) {
    if (username !== senderUsername && !reply.raw.destroyed) {
      sendSSE(reply, event, data);
    }
  }
}

/** Send an event to a specific user (if online). Returns true if delivered. */
export function sendToUser(username: string, event: string, data: unknown): boolean {
  const reply = connectionsMap.get(username);
  if (reply && !reply.raw.destroyed) {
    sendSSE(reply, event, data);
    return true;
  }
  return false;
}

/** Check if a user is currently connected */
export function isUserOnline(username: string): boolean {
  const reply = connectionsMap.get(username);
  return !!reply && !reply.raw.destroyed;
}

/** Get all currently online usernames */
export function getOnlineUsers(): string[] {
  return Array.from(connectionsMap.keys()).filter((u) => {
    const reply = connectionsMap.get(u);
    return reply && !reply.raw.destroyed;
  });
}

export async function sseRoutes(fastify: FastifyInstance) {
  // GET /events/:username — SSE stream for real-time events
  fastify.get<{ Params: { username: string } }>(
    "/events/:username",
    async (request, reply) => {
      const username = request.params.username;

      if (!username) {
        return reply.code(400).send({ error: "Missing username" });
      }

      // Ensure the chat user record exists
      await findOrCreateUser(username);

      // Close any existing connection for this user (reconnect scenario)
      const existing = connectionsMap.get(username);
      if (existing && !existing.raw.destroyed) {
        existing.raw.end();
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
      });

      // Register connection
      connectionsMap.set(username, reply);
      console.log(`[chat] ${username} connected via SSE (total: ${connectionsMap.size})`);

      // Send current online users to the new connection
      sendSSE(reply, "online_users", {
        type: "online_users",
        users: getOnlineUsers(),
      });

      // Send unread message summary (messages received while offline)
      const unreadSummary = await getUnreadSummary(username);
      if (unreadSummary.length > 0) {
        sendSSE(reply, "unread_summary", {
          type: "unread_summary",
          entries: unreadSummary,
        });
      }

      // Send pending game invites (not yet accepted)
      const pendingInvites = await getPendingGameInvites(username);
      if (pendingInvites.length > 0) {
        sendSSE(reply, "pending_game_invites", {
          type: "pending_game_invites",
          invites: pendingInvites,
        });
      }

      // Notify all others that this user is now online
      broadcastExcept(username, "user_online", {
        type: "user_online",
        username,
      });

      // Send periodic heartbeat to keep the connection alive
      const heartbeat = setInterval(() => {
        if (reply.raw.destroyed) {
          clearInterval(heartbeat);
          return;
        }
        reply.raw.write(": heartbeat\n\n");
      }, 30000);

      // Handle disconnect
      request.raw.on("close", () => {
        clearInterval(heartbeat);
        connectionsMap.delete(username);
        console.log(`[chat] ${username} disconnected from SSE (total: ${connectionsMap.size})`);

        // Notify others that user went offline
        for (const [, otherReply] of connectionsMap.entries()) {
          if (!otherReply.raw.destroyed) {
            sendSSE(otherReply, "user_offline", {
              type: "user_offline",
              username,
            });
          }
        }
      });

      // Keep the connection open (don't call reply.send())
      await reply;
    },
  );
}
