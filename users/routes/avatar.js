export default async function avatarRoutes(fastify) {

	// Upload avatar (base64 webp)
	fastify.post('/me/avatar', {
		bodyLimit: 2 * 1024 * 1024 // 2MB to account for base64 overhead
	}, async (request, reply) => {
		if (!request.isAuthenticated()) {
			return reply.code(401).send({ error: 'Not authenticated' })
		}

		const { avatar } = request.body

		if (!avatar || typeof avatar !== 'string') {
			return reply.code(400).send({ error: 'Missing avatar data' })
		}

		// Validate it's a base64 data URL for webp/png/jpeg
		if (!avatar.startsWith('data:image/')) {
			return reply.code(400).send({ error: 'Invalid image format' })
		}

		// Check size: base64 string should not exceed ~1.4MB (1MB image)
		if (avatar.length > 1.5 * 1024 * 1024) {
			return reply.code(413).send({ error: 'Image too large, max 1MB' })
		}

		fastify.users.updateAvatar.run(avatar, request.user.id)

		return { message: 'Avatar updated successfully' }
	})

	// Delete avatar
	fastify.delete('/me/avatar', async (request, reply) => {
		if (!request.isAuthenticated()) {
			return reply.code(401).send({ error: 'Not authenticated' })
		}

		const user = fastify.users.findById.get(request.user.id)

		// For Google users: if they have a custom avatar (different from their
		// Google one), fall back to the Google photo. Otherwise, clear it entirely.
		if (user?.google_id && user?.google_avatar && user?.avatar !== user?.google_avatar) {
			fastify.users.updateAvatar.run(user.google_avatar, request.user.id)
			return { message: 'Avatar reset to Google profile picture' }
		}

		fastify.users.updateAvatar.run(null, request.user.id)

		return { message: 'Avatar removed successfully' }
	})
}
