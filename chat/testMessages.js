const { PrismaClient } = require('@prisma/client');

async function testMessages() {
    const prisma = new PrismaClient();

    try {
        // Create two users
        const user1 = await prisma.user.create({
            data: { username: 'Alice' }
        });
        console.log('✓ Created user:', user1.username);

        const user2 = await prisma.user.create({
            data: { username: 'Bob' }
        });
        console.log('✓ Created user:', user2.username);

        // Create messages
        const msg1 = await prisma.message.create({
            data: {
                content: 'Hello Bob!',
                senderId: user1.id,
                receiverId: user2.id
            }
        });
        console.log('✓ Message created:', msg1.content);

        const msg2 = await prisma.message.create({
            data: {
                content: 'Hi Alice!',
                senderId: user2.id,
                receiverId: user1.id
            }
        });
        console.log('✓ Message created:', msg2.content);

        // Get messages between users
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: user1.id, receiverId: user2.id },
                    { senderId: user2.id, receiverId: user1.id }
                ]
            },
            include: { sender: true, receiver: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log('✓ Retrieved messages:', messages.length);
        messages.forEach(m => {
            console.log(`  ${m.sender.username} → ${m.receiver.username}: "${m.content}"`);
        });

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testMessages();
