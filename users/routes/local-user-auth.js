import { hashPassword, verifyPassword } from "../utilities/password_hasher.js";
import { validateUsername, validatePassword, validateEmail } from "../utilities/validation_regex.js";
import crypto from 'node:crypto'


//this is the function that ties everything and makes use of our plugins.
//verify username, email and password according to our regex, check for already existing credentials as well
export default async function localAuthRoutes(fastify) {
	
	fastify.post('/auth/register', async (request, reply) => {
		const { username, email, password, alias } = request.body
	
		if (!username || !email || !password || !alias) {
			return reply.code(400).send({ error: 'Missing fields, please fill all fields.'})
		}

		if (!validateUsername(username)) {
			return reply.code(400).send({ error: 'Invalid username.'})
		}

		if (!validateEmail(email)) {
			return reply.code(400).send({ error: 'Invalid email format.'})
		}

		if (!validatePassword(password)) {
			return reply.code(400).send({ error: 'Invalid / weak password.'})
		}

		const duplicateEmail = fastify.users.findByEmail.get(email)
		if (duplicateEmail) {
			return reply.code(409).send({ error: 'Email already in use.'})
		}

		const duplicateUsername = fastify.users.findByUsername.get(username)
		if (duplicateUsername) {
			return reply.code(409).send({ error: 'Username already exists.'})
		}

		const passwordHash = await hashPassword(password)
		const id = crypto.randomUUID()

		fastify.users.createLocalUser.run(
			id,
			username,
			email,
			alias,
			passwordHash
		)

		const user = fastify.users.findById.get(id)

		await request.login(user)

		reply.send({ message: 'Registration successful!', user})
	})

	fastify.post('/auth/login', async (request, reply) => {
		const {identifier, password} = request.body
	
		if (!identifier || !password){
			return reply.code(400).send({ error: 'Missing field.'})
		}
		
		const user = 
		fastify.users.findByEmail.get(identifier) ||
		fastify.users.findByUsername.get(identifier)
	
		if (!user || !user.password_hash) {
			return reply.code(401).send({ error: 'Invalid credentials'})
		}
	
		const valid = await verifyPassword(user.password_hash, password)
	
		if (!valid) {
			return reply.code(401).send({ error: 'Invalid credentials.'})
		}
	
		await request.login(user)
	
		reply.send({ message: 'Logged in successfully!', user})
	})
}
