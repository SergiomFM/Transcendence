const { PrismaClient } = require('@prisma/client');

async function basicTest()
{
  const prisma = new PrismaClient();

  try {
    //Create a user
    try {
        const user = await prisma.user.create({
            data: {
                username: 'Gofas',
            }
        });
        console.log('✓ User created: ', user.username);
    } catch (error) {
        console.error('✗ Failed to create user:', error.message);
    }

    //Find user by ID
    try {
        const user = await prisma.user.findUnique({
            where: { id: 4}
        });
        console.log('✓ User found: ', user.username);
    } catch (error) {
        console.error('✗ User not found:', error.message);
    }

    //Find user named Gofas
    try {
        const user = await prisma.user.findFirst({
            where: { username: 'Gofas' }
        });
        if (user) {
            console.log('✓ User Gofas found: ', user.username, ' Id: ', user.id);
        } else {
            console.log('✗ User Gofas not found');
        }
    } catch (error) {
        console.error('✗ Failed to find user Gofas:', error.message);
    }

    //Update user
    try {
        const user = await prisma.user.update({
            where: { id: 1 },
            data: {
                username: 'updated_user',
            }
        });
        console.log('✓ User updated: ', user.username);
    } catch (error) {
        console.error('✗ User update failed:', error.message);
    }

    //Create message
    try {
        const message = await prisma.message.create({
            data: {
                content: 'Hello, world!',
                userId: 1
            }
        });
        console.log('✓ Message created: ', message.content);
    } catch (error) {
        console.error('✗ Failed to create message:', error.message);
    }

    //Get messages
    try {
        const messages = await prisma.message.findMany({
            include: { user: true }
        });
        console.log('✓ Messages found:', messages.length);
    } catch (error) {
        console.error('✗ Failed to get messages:', error.message);
    }

    //Delete message
    try {
        await prisma.message.deleteMany({
            where: { userId: 1 }
        });
        console.log('✓ Messages deleted');
    } catch (error) {
        console.error('✗ Failed to delete messages:', error.message);
    }

    //Delete User
    try {
        const deleted = await prisma.user.delete({
            where: { id: 1 }
        });
        console.log('✓ User deleted');
    } catch (error) {
        console.error('✗ User deletion failed:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

basicTest();
