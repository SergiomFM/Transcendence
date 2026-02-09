export default async function playerProfileRoutes(fastify){

	//basic get for retrieving own profile
	fastify.get("/me/profile", async(req, reply) =>{
		if (!req.isAuthenticated()) {
			return reply.code(401).send({ error: "Unauthorized" })
		}

		const profile = fastify.profiles.findByUserId.get(req.user.id)
		return profile
	})

	//search tool to find profiles by looking up user id
	fastify.get("/player/:userId", async (req, reply) => {
		const profile = fastify.profiles.findByUserId.get(req.params.userId)
		if (!profile)
			return reply.code(404).send({ error: "Not found" })

		return profile
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