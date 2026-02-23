
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import BetterSqlite3 from 'better-sqlite3';


export default prismaInit 

function prismaInit(app)
{
    const prismaPlugin = fp(async (server, options) => {
    const dbPath = '/app/database/app.db';
    
    const prisma = new PrismaClient({
        adapter: new PrismaD1(new BetterSqlite3(dbPath)),
    });

    server.decorate('prisma', prisma);

    server.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
    });


    app.register(prismaPlugin);
}