


import type  { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";
import type { Message } from "@prisma/client";

const prisma = new PrismaClient();

export async function createUser(name: string)
{
    try
    {
      const user = await prisma.user.create({
            data:
            {
                username: name
            }
        });
        return user;
    }
    catch (error: unknown)
    {
        if (error instanceof Error)
        {
            console.error('Failed to create user:', error.message);
        } else {
            console.error('Failed to create user:', error);
        }
        return null;
    }
}

export async function createMessage(receiver: User, sender: User, content: string)
{
     try
     {

        //Create Sender Message
        await prisma.message.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                content: content
            }
        });


        //Create Reciver Message

        const message = await prisma.message.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                content: content
            }
        });

        return message;
       

    }
    catch (error: unknown)
    {
        if (error instanceof Error)
        {
            console.error('Failed to create message:', error.message);
        } else
        {
            console.error('Failed to create message:', error);
        }
        return null;
    }
}

export async function getMessages(user: User, otherUser: User, n: number): Promise<Message[]>
{
    try
    {
        const messages = await prisma.message.findMany({
            where:
            {
                OR: [
                    {
                        senderId: user.id,
                        receiverId: otherUser.id
                    },
                    {
                        senderId: otherUser.id,
                        receiverId: user.id
                    }
                ]
            },
            include: {
                sender: true,
                receiver: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: n
        });
        return messages;
    } catch (error: unknown)
    {
        if (error instanceof Error) 
        {
            console.error('Failed to get messages:', error.message);
        } else
        {
            console.error('Failed to get messages:', error);
        }
        return [];
    }
}

export async function messageRoutes(fastify: FastifyInstance ) {


    //Create new message

    fastify.post<{ Body: { reciverUsename: string; senderUsername: string ; content: string} }>("/sendMessage", async (request, reply) => {

    ////////////////////////
    //Verify Sender
    ////////////////////////

    ////////////////////////
    //Verify Receiver
    ////////////////////////

    const receiverUsename= request.body. reciverUsename;
    const senderUsename = request.body.senderUsername;
    const content = request.body.content;

    //Find Sender and Receiver
    const sender = await prisma.user.findUnique({ where: { username: senderUsename } });
    const receiver = await prisma.user.findUnique({ where: { username: receiverUsename } });
        
    if (!sender || !receiver)
    {
        return reply.code(404).send({ error: "User not found" });
    }

    await createMessage(receiver, sender, content);
    
    ////////////////////////
    //Ping active users
    ////////////////////////
    
    return reply.code(201).send({ message: "Message sent" });
    
  });
  

  //Request User messages

  fastify.get<{ Body: { userName: string; otherUserName: string ;  n: number} }>("/getMessages", async (request, reply) => {


    ////////////////////////
    //Verify 
    ////////////////////////

    const userName = request.body.userName;
    const otherUserName = request.body.otherUserName;
    const n = request.body.n;

    const user = await prisma.user.findUnique({ where: { username: userName } });
    const otherUser = await prisma.user.findUnique({ where: { username: otherUserName } });

    if (!user || !otherUser)
    {
        return reply.code(404).send({ error: "User not found" });
    }

    const messages = await getMessages(user, otherUser, n);

    return messages;

    
  });
}

