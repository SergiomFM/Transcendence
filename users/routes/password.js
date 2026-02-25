import { hashPassword, verifyPassword } from "../utilities/password_hasher.js";
import { validatePassword } from "../utilities/validation_regex.js";

export default async function passwordRoutes(fastify) {

	fastify.post('/me/password', async (request, reply) => {
		if (!request.isAuthenticated()) {
			return reply.code(401).send({ error: 'Not authenticated' })
		}

		if (request.user.google_id) {
			return reply.code(400).send({ error: 'Google users cannot change password' })
		}

		const { currentPassword, newPassword } = request.body

		if (!currentPassword || !newPassword) {
			return reply.code(400).send({ error: 'Missing required fields' })
		}

		if (!request.user.password_hash) {
			return reply.code(400).send({ error: 'No password set for this account' })
		}

		const valid = await verifyPassword(request.user.password_hash, currentPassword)
		if (!valid) {
			return reply.code(401).send({ error: 'Current password is incorrect' })
		}

		if (!validatePassword(newPassword)) {
			return reply.code(400).send({ error: 'New password does not meet requirements' })
		}

		const newHash = await hashPassword(newPassword)
		fastify.users.setPassword.run(newHash, request.user.id)

		return { message: 'Password changed successfully' }
	})
}
