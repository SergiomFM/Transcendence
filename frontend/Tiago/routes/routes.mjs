
export default async function home(fastify, options) {
	fastify.get('/', async function handler (request, reply) {

		reply.view('home.ejs' ,{ BT: 'pica'}) 
		return reply
	})
};
