import type  { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";
import type { Message } from "@prisma/client";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "@fastify/websocket";

const prisma = new PrismaClient();

async function wsManager()
{

}

export async function webSocketsRoutes(fastify: FastifyInstance )
{
    const connectionsMap: Map<number, WebSocket> = new Map();


    fastify.get<{ Params: { userId: string } }>('/ws/:userId', { websocket: true }, (connection, req) => {
    const userId = parseInt(req.params.userId);
    
    //Add connection
    connectionsMap.set(userId, connection);
    console.log(`User ${userId} connected`);
    
    // Handle incoming messages
    connection.on('message', async (data) => {
        const message = JSON.parse(data.toString());
        
        // Create message in DB
        await prisma.message.create({
            data: {
                content: message.content,
                senderId: userId,
                receiverId: message.receiverId
            }
        });
        
        // Send to receiver if online
        const receiverSocket = connectionsMap.get(message.receiverId);
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
            receiverSocket.send(JSON.stringify({
                type: 'message',
                from: userId,
                content: message.content,
                timestamp: new Date()
            }));
        }
    });
    
    // Handle dc
    connection.on('close', () => {
        connectionsMap.delete(userId);
        console.log(`User ${userId} disconnected`);
    });
});
}