export default async function friendsRoutes(fastify) {

	//SEND FRIEND REQUEST
	fastify.post("/friends/request", async(req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})
	
		const { receiverId } = req.body;
		if (!receiverId || receiverId == req.user.id)
			return reply.code(400).send({ error: "Invalid receiver" })
		
		const existence = fastify.friends.getRequest.get(req.user.id, receiverId)
		if (existence)
			return reply.code(400).send({ error: "Request already exists" })

		fastify.friends.sendRequest.run(crypto.randomUUID(), req.user.id, receiverId)
		return { message: "Friend request sent" };
	})

	//ACCEPT FRIEND REQUEST
	fastify.post("/friends/accept", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const {requestId } = req.body;
		const request = fastify.friends.getRequest.get(req.user.id, requestId)
		if (!request)
			return reply.code(404).send({ error: "Request not found"})

		//this sets up friendship on both sides, DONT TOUCH IT
		fastify.friends.addFriend.run(req.user.id, request.sender_id)
		fastify.friends.addFriend.run(request.sender_id, req.user.id)

		fastify.friends.deleteRequest.run(request.id)

		return { message: "Friend request accepted" }
	})

	//LIST FRIENDS
	fastify.get("/friends", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User."})

		const friends = fastify.friends.listFriends.all(req.user.id)
		return { friends }
	})
}