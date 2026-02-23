export default async function playerProfileRoutes(fastify){

	//basic get for retrieving own profile
	fastify.get("/me/profile", async(req, reply) =>{
		if (!req.isAuthenticated()) {
			return reply.code(401).send({ error: "Unauthorized" })
		}

		const profile = fastify.profiles.findByUserId.get(req.user.id)
		if (!profile) return profile

		const wins = fastify.matches.countWins.get(req.user.id)?.wins || 0
		const losses = fastify.matches.countLosses.get(req.user.id, req.user.id, req.user.id)?.losses || 0

		return { ...profile, wins, losses }
	})

	//search tool to find profiles by looking up user id
	fastify.get("/player/:userId", async (req, reply) => {
		const profile = fastify.profiles.findByUserId.get(req.params.userId)
		if (!profile)
			return reply.code(404).send({ error: "Not found" })

		const wins = fastify.matches.countWins.get(req.params.userId)?.wins || 0
		const losses = fastify.matches.countLosses.get(req.params.userId, req.params.userId, req.params.userId)?.losses || 0

		return { ...profile, wins, losses }
	})

	fastify.post("/me/profile/display-name", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send()

		const { display_name } = req.body
		if (!display_name)
			return (reply.code(400).send())

		fastify.profiles.updateDisplayName.run(display_name, req.user.id)
		return { message: "Updated."}
	})

	//bio update tool
	fastify.post("/me/profile/bio", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send()
		
		fastify.profiles.updateBio.run(req.body.bio, req.user.id)
		return{ message: "Updated" }
	})
}