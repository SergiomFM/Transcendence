const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL;

/**
 * Register a user in the chat service so they can receive messages
 * immediately, without needing to visit the chat page first.
 *
 * This is fire-and-forget: chat registration failure should never
 * block login or account creation.
 */
export async function registerChatUser(user) {
	if (!CHAT_BACKEND_URL) return;

	const username = user.username || user.alias;
	if (!username) return;

	try {
		await fetch(`${CHAT_BACKEND_URL}/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username }),
		});
	} catch (err) {
		console.error('[users] Failed to register user in chat service:', err.message);
	}
}
