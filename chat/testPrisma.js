const { PrismaClient } = require('@prisma/client');

async function testPrismaConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Testing Prisma connection...');
    
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');

    // Get all users
    const users = await prisma.user.findMany();
    console.log(`✓ Users in database: ${users.length}`);

    // Get all messages
    const messages = await prisma.message.findMany();
    console.log(`✓ Messages in database: ${messages.length}`);

    console.log('\n✓ Prisma is working correctly!');
  } catch (error) {
    console.error('✗ Prisma connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection();
