import fastifyPassport from '@fastify/passport'

export default async function (fastify){

	//GOOGLE LOGIN START
	fastify.get(
	
		'/auth/google',
		fastifyPassport.authenticate('google', {
			scope: ['profile', 'email']
		})
	);
	
	//GOOGLE CALLBACK
	fastify.get(
	
		'/auth/google/callback',
		fastifyPassport.authenticate('google', {
			failureRedirect: '/login',
			successRedirect: '/dashboard'
		})
	);
	
	// PROTECTED ROUTE (REASON FOR EXISTENCE: DEMONSTRATE AUTHORIZATION)
	
	fastify.get(
		
		'/dashboard', async (req, reply) => {
		
		if (!req.isAuthenticated()) {
			reply.redirect('/auth/google');
			return;
		}
		return { message: 'Welcome to our server.', user: req.user};
	});
}

//fastify.listen({port: 3000}); -> 