export default async function friendsRoutes(fastify) {

	//SEND FRIEND REQUEST
	fastify.post("/friends/request", async(req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})
	
		const { receiverId } = req.body;
		if (!receiverId || receiverId === req.user.id)
			return reply.code(400).send({ error: "Invalid receiver" })

		// Check if receiver exists
		const receiver = fastify.users.findById.get(receiverId)
		if (!receiver)
			return reply.code(404).send({ error: "User not found" })

		// Check if already friends
		const alreadyFriends = fastify.friends.isFriend.get(req.user.id, receiverId)
		if (alreadyFriends)
			return reply.code(400).send({ error: "Already friends" })

		// Check if a request already exists in either direction
		const existing = fastify.friends.getRequestBetween.get(req.user.id, receiverId, receiverId, req.user.id)
		if (existing)
			return reply.code(400).send({ error: "Request already exists" })

		fastify.friends.sendRequest.run(crypto.randomUUID(), req.user.id, receiverId)
		return { message: "Friend request sent" };
	})

	//ACCEPT FRIEND REQUEST
	fastify.post("/friends/accept", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const { requestId } = req.body;
		if (!requestId)
			return reply.code(400).send({ error: "requestId is required" })

		// The current user is the receiver: fetch by id and ensure this user is the receiver
		const request = fastify.friends.getRequestById.get(requestId)
		if (!request || request.receiver_id !== req.user.id)
			return reply.code(404).send({ error: "Request not found"})

		//this sets up friendship on both sides, DONT TOUCH IT
		fastify.friends.addFriend.run(req.user.id, request.sender_id)
		fastify.friends.addFriend.run(request.sender_id, req.user.id)

		fastify.friends.deleteRequest.run(request.id)

		return { message: "Friend request accepted" }
	})

	//REJECT FRIEND REQUEST
	fastify.post("/friends/reject", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const { requestId } = req.body;
		if (!requestId)
			return reply.code(400).send({ error: "requestId is required" })

		const request = fastify.friends.getRequestById.get(requestId)
		if (!request || request.receiver_id !== req.user.id)
			return reply.code(404).send({ error: "Request not found"})

		fastify.friends.deleteRequest.run(request.id)

		return { message: "Friend request rejected" }
	})

	//LIST PENDING INCOMING FRIEND REQUESTS
	fastify.get("/friends/requests", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const requests = fastify.friends.getIncomingRequests.all(req.user.id)
		return { requests }
	})

	//LIST PENDING SENT FRIEND REQUESTS
	fastify.get("/friends/requests/sent", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const requests = fastify.friends.getSentRequests.all(req.user.id)
		return { requests }
	})

	//CANCEL A SENT FRIEND REQUEST
	fastify.delete("/friends/request/:receiverId", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const { receiverId } = req.params;
		const request = fastify.friends.getSentRequestTo.get(req.user.id, receiverId)
		if (!request)
			return reply.code(404).send({ error: "Request not found" })

		fastify.friends.deleteRequest.run(request.id)
		return { message: "Friend request cancelled" }
	})

	//LIST FRIENDS
	fastify.get("/friends", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User."})

		const friends = fastify.friends.listFriends.all(req.user.id)
		return { friends }
	})

	//REMOVE FRIEND
	fastify.delete("/friends/:friendId", async (req, reply) => {
		if (!req.isAuthenticated())
			return reply.code(401).send({ error: "Unauthorized User"})

		const { friendId } = req.params;
		if (!friendId || friendId === req.user.id)
			return reply.code(400).send({ error: "Invalid friendId" })

		// Remove both sides of the friendship
		fastify.friends.removeFriend.run(req.user.id, friendId)
		fastify.friends.removeFriend.run(friendId, req.user.id)

		return { message: "Friend removed" }
	})
}
