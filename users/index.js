import fastify from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import prismaInit from './prisma_setup.js';

// // Prisma plugin
// const prismaPlugin = fp(async (server, options) => {
// const databaseUrl = process.env.DATABASE_URL || 'file:./data/dev.db';
// const dbPath = databaseUrl.replace('file:', '');
  
//   const prisma = new PrismaClient({
//     adapter: new PrismaD1(new BetterSqlite3(dbPath)),
//   });

//   // Make Prisma Client available through the fastify server instance
//   server.decorate('prisma', prisma);

//   server.addHook('onClose', async (server) => {
//     await server.prisma.$disconnect();
//   });
// });

// Create Fastify app
const app = fastify();

prismaInit(app);

await app.listen({ port: 3001, host: '0.0.0.0' });
console.log('Server listening on http://0.0.0.0:3000');
