export default async function matchRoutes(fastify) {

	// POST /matches — called by the game server to record a match result
	fastify.post("/matches", async (req, reply) => {
		const { player1_id, player2_id, player1_score, player2_score, winner_id } = req.body

		// At least one player must be authenticated
		if (!player1_id && !player2_id) {
			return reply.code(400).send({ error: "At least one player must be authenticated" })
		}

		if (player1_score == null || player2_score == null) {
			return reply.code(400).send({ error: "Missing required score fields" })
		}

		// Winner must be one of the players (or null if the winner is a guest)
		if (winner_id && winner_id !== player1_id && winner_id !== player2_id) {
			return reply.code(400).send({ error: "Winner must be one of the players" })
		}

		try {
			fastify.matches.insert.run(
				player1_id || null,
				player2_id || null,
				player1_score,
				player2_score,
				winner_id || null
			)
			return { message: "Match recorded" }
		} catch (err) {
			fastify.log.error("Error recording match:", err)
			return reply.code(500).send({ error: "Failed to record match" })
		}
	})

	// GET /me/matches — returns the authenticated user's match history
	fastify.get("/me/matches", async (req, reply) => {
		if (!req.isAuthenticated()) {
			return reply.code(401).send({ error: "Unauthorized" })
		}

		try {
			const matches = fastify.matches.getByUserId.all(req.user.id, req.user.id)
			return { matches }
		} catch (err) {
			fastify.log.error("Error fetching match history:", err)
			return reply.code(500).send({ error: "Failed to fetch match history" })
		}
	})

	// GET /player/:userId/matches — returns a player's match history (public)
	fastify.get("/player/:userId/matches", async (req, reply) => {
		const { userId } = req.params

		// Check the player exists
		const profile = fastify.profiles.findByUserId.get(userId)
		if (!profile) {
			return reply.code(404).send({ error: "Player not found" })
		}

		try {
			const matches = fastify.matches.getByUserId.all(userId, userId)
			return { matches }
		} catch (err) {
			fastify.log.error("Error fetching match history:", err)
			return reply.code(500).send({ error: "Failed to fetch match history" })
		}
	})
}
