import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import type { User, Message } from "@prisma/client";
import { sendToUser } from "./sse.ts";

const prisma = new PrismaClient();

export async function findOrCreateUser(username: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({ data: { username } });
}

/**
 * Get a summary of unread messages for a user, grouped by sender.
 * Returns an array of { from: username, count, lastMessage, lastTimestamp }.
 */
export async function getUnreadSummary(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return [];

  const unreadMessages = await prisma.message.findMany({
    where: { receiverId: user.id, read: false },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by sender
  const grouped = new Map<string, { count: number; lastMessage: string; lastTimestamp: string }>();
  for (const msg of unreadMessages) {
    const from = msg.sender.username;
    const existing = grouped.get(from);
    grouped.set(from, {
      count: (existing?.count ?? 0) + 1,
      lastMessage: msg.content,
      lastTimestamp: msg.createdAt.toISOString(),
    });
  }

  return Array.from(grouped.entries()).map(([from, data]) => ({ from, ...data }));
}

/**
 * Mark all messages from a specific sender to a receiver as read.
 * Returns the number of messages marked.
 */
export async function markMessagesRead(senderUsername: string, receiverUsername: string): Promise<number> {
  const sender = await prisma.user.findUnique({ where: { username: senderUsername } });
  const receiver = await prisma.user.findUnique({ where: { username: receiverUsername } });
  if (!sender || !receiver) return 0;

  const result = await prisma.message.updateMany({
    where: {
      senderId: sender.id,
      receiverId: receiver.id,
      read: false,
    },
    data: { read: true },
  });

  return result.count;
}

/**
 * Get all pending (unaccepted) game invites for a user.
 * Returns shaped objects ready to send to the frontend.
 */
export async function getPendingGameInvites(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return [];

  const invites = await prisma.gameInvite.findMany({
    where: { receiverId: user.id, accepted: false },
    include: { sender: true },
    orderBy: { createdAt: "desc" },
  });

  return invites.map((inv) => ({
    id: inv.id,
    from: inv.sender.username,
    to: username,
    roomId: inv.roomId,
    timestamp: inv.createdAt.toISOString(),
  }));
}

export async function createMessage(
  sender: User,
  receiver: User,
  content: string,
): Promise<Message | null> {
  try {
    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        content,
      },
    });
    return message;
  } catch (error: unknown) {
    console.error("Failed to create message:", error);
    return null;
  }
}

export async function getMessages(
  user: User,
  otherUser: User,
  n: number = 50,
): Promise<Message[]> {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: otherUser.id },
          { senderId: otherUser.id, receiverId: user.id },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: { createdAt: "asc" },
      take: n,
    });
    return messages;
  } catch (error: unknown) {
    console.error("Failed to get messages:", error);
    return [];
  }
}

export async function messageRoutes(fastify: FastifyInstance) {
  // POST /sendMessage — persists message and pushes to SSE connections
  fastify.post<{
    Body: { senderUsername: string; receiverUsername: string; content: string };
  }>("/sendMessage", async (request, reply) => {
    const { senderUsername, receiverUsername, content } = request.body;

    if (!senderUsername || !receiverUsername || !content?.trim()) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const sender = await prisma.user.findUnique({
      where: { username: senderUsername },
    });
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!sender || !receiver) {
      return reply.code(404).send({ error: "User not found" });
    }

    const message = await createMessage(sender, receiver, content.trim());
    if (!message) {
      return reply.code(500).send({ error: "Failed to create message" });
    }

    const outgoing = {
      type: "message" as const,
      id: message.id,
      from: senderUsername,
      to: receiverUsername,
      content: message.content,
      timestamp: message.createdAt,
    };

    // Push to sender's SSE stream (echo with self: true)
    sendToUser(senderUsername, "message", { ...outgoing, self: true });

    // Push to receiver's SSE stream if online (self: false)
    sendToUser(receiverUsername, "message", { ...outgoing, self: false });

    // Return the shaped message so the frontend can use it directly
    return reply.code(201).send({ ...outgoing, self: true });
  });

  // POST /sendGameInvite — persist game invite and push via SSE
  fastify.post<{
    Body: { senderUsername: string; receiverUsername: string; roomId: string };
  }>("/sendGameInvite", async (request, reply) => {
    const { senderUsername, receiverUsername, roomId } = request.body;

    if (!senderUsername || !receiverUsername || !roomId) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const sender = await prisma.user.findUnique({ where: { username: senderUsername } });
    const receiver = await prisma.user.findUnique({ where: { username: receiverUsername } });

    if (!sender || !receiver) {
      return reply.code(404).send({ error: "User not found" });
    }

    // Persist the invite
    const invite = await prisma.gameInvite.create({
      data: {
        roomId,
        senderId: sender.id,
        receiverId: receiver.id,
      },
    });

    const outgoing = {
      type: "game_invite" as const,
      id: invite.id,
      from: senderUsername,
      to: receiverUsername,
      roomId,
      timestamp: invite.createdAt.toISOString(),
    };

    // Echo back to sender
    sendToUser(senderUsername, "game_invite", { ...outgoing, self: true });

    // Forward to receiver if online
    const delivered = sendToUser(receiverUsername, "game_invite", { ...outgoing, self: false });

    return reply.code(200).send({ delivered, id: invite.id });
  });

  // POST /acceptGameInvite — mark a game invite as accepted
  fastify.post<{
    Body: { inviteId?: number; roomId?: string; receiverUsername: string };
  }>("/acceptGameInvite", async (request, reply) => {
    const { inviteId, roomId, receiverUsername } = request.body;

    if (!receiverUsername || (!inviteId && !roomId)) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const receiver = await prisma.user.findUnique({ where: { username: receiverUsername } });
    if (!receiver) {
      return reply.code(404).send({ error: "User not found" });
    }

    // Accept by inviteId or by roomId (all pending invites for this room)
    if (inviteId) {
      await prisma.gameInvite.updateMany({
        where: { id: inviteId, receiverId: receiver.id, accepted: false },
        data: { accepted: true },
      });
    } else if (roomId) {
      await prisma.gameInvite.updateMany({
        where: { roomId, receiverId: receiver.id, accepted: false },
        data: { accepted: true },
      });
    }

    return reply.code(200).send({ ok: true });
  });

  // GET /messages?user=a&otherUser=b&n=50
  fastify.get<{
    Querystring: { user: string; otherUser: string; n?: string };
  }>("/messages", async (request, reply) => {
    const { user: userName, otherUser: otherUserName, n } = request.query;

    if (!userName || !otherUserName) {
      return reply.code(400).send({ error: "Missing user or otherUser query param" });
    }

    const user = await prisma.user.findUnique({ where: { username: userName } });
    const otherUser = await prisma.user.findUnique({
      where: { username: otherUserName },
    });

    if (!user || !otherUser) {
      return reply.code(404).send({ error: "User not found" });
    }

    const limit = Math.min(parseInt(n ?? "50", 10) || 50, 200);
    const messages = await getMessages(user, otherUser, limit);
    return messages;
  });

  // POST /register — ensure a chat user exists for a given username
  fastify.post<{ Body: { username: string } }>(
    "/register",
    async (request, reply) => {
      const { username } = request.body;
      if (!username) return reply.code(400).send({ error: "Missing username" });
      const user = await findOrCreateUser(username);
      return reply.code(200).send(user);
    },
  );

  // POST /markRead — mark all messages from a sender as read for the receiver
  fastify.post<{
    Body: { senderUsername: string; receiverUsername: string };
  }>("/markRead", async (request, reply) => {
    const { senderUsername, receiverUsername } = request.body;

    if (!senderUsername || !receiverUsername) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const count = await markMessagesRead(senderUsername, receiverUsername);
    return reply.code(200).send({ marked: count });
  });
}
