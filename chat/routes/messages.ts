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

    return reply.code(201).send(message);
  });

  // POST /sendGameInvite — ephemeral game invite, not persisted
  fastify.post<{
    Body: { senderUsername: string; receiverUsername: string; roomId: string };
  }>("/sendGameInvite", async (request, reply) => {
    const { senderUsername, receiverUsername, roomId } = request.body;

    if (!senderUsername || !receiverUsername || !roomId) {
      return reply.code(400).send({ error: "Missing required fields" });
    }

    const outgoing = {
      type: "game_invite" as const,
      from: senderUsername,
      to: receiverUsername,
      roomId,
      timestamp: new Date().toISOString(),
    };

    // Echo back to sender
    sendToUser(senderUsername, "game_invite", { ...outgoing, self: true });

    // Forward to receiver if online
    const delivered = sendToUser(receiverUsername, "game_invite", { ...outgoing, self: false });

    return reply.code(200).send({ delivered });
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
}
