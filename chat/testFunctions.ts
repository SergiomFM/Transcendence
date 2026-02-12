import { createUser, createMessage, getMessages } from './routes/messages';

async function testFunctions() {
    try {
        // Test createUser
        console.log('\n--- Testing createUser ---');
        const alice = await createUser('Alice');
        console.log('✓ Created user Alice:', alice?.username);

        const bob = await createUser('Bob');
        console.log('✓ Created user Bob:', bob?.username);

        // Test createMessage
        console.log('\n--- Testing createMessage ---');
        if (alice && bob) {
            const msg1 = await createMessage(bob, alice, 'Hello Bob!');
            console.log('✓ Message created:', msg1?.content);

            const msg2 = await createMessage(alice, bob, 'Hi Alice!');
            console.log('✓ Message created:', msg2?.content);

            // Test getMessages
            console.log('\n--- Testing getMessages ---');
            const messages = await getMessages(alice, bob, 5);
            console.log('✓ Retrieved messages:', messages.length);
            messages.forEach(m => {
                console.log(`  ${m.sender.username} → ${m.receiver.username}: "${m.content}"`);
            });
        }

    } catch (error) {
        console.error('✗ Test failed:', error);
    }
    process.exit(0);
}

testFunctions();
