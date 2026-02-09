import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import { messageRoutes } from "./routes/messages.ts";
import { webSocketsRoutes } from "./routes/webSockets.ts";

const fastify = Fastify({ logger: true });

const prisma = new PrismaClient();



// Register WebSocket

await fastify.register(fastifyWebsocket);


//Register routes

messageRoutes(fastify);
webSocketsRoutes(fastify);





// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server listening on http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();