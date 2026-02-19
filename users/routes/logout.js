export default async function logoutRoutes(fastify) {

	fastify.get('/auth/logout', async (req, reply) => {

		if (req.session.pending2FA) {
			delete req.session.pending2FA
		}

		req.logout(err => {
			if (err) {
				fastify.log.error(err)
				return reply.code(500).send({ error: "Logout failure." })
			}

			req.session.destroy(err => {
				if (err) {
					fastify.log.error(err)
					return reply.code(500).send({ error: "Failed to destroy session."})
				}
			})

			reply.clearCookie('connect.sid', { path: '/' })
			return reply.redirect('/login');
		})
	})
}