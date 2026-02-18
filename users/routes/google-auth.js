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
		{
			preValidation: fastifyPassport.authenticate('google', {
				failureRedirect: '/login'
			})
		},
		async (req, reply) => {
			const user = req.user;
		
		if (!user) {
			return reply.redirect('/login');
		}
	
		if (!user.is_active) {
			return reply.code(403).send({ error: "Account disabled" });
		}
	
		if (user.two_factor_enabled) {
			req.session.pending2FA = user.id;
			await req.session.save(); // ensure session persists
			return reply.redirect('http://localhost:3000/2fa');
		}
	
		await req.logIn(user);
		return reply.redirect('http://localhost:3000');
		}
	);

	
	// PROTECTED ROUTE (REASON FOR EXISTENCE: DEMONSTRATE AUTHORIZATION)
	
	fastify.get(
		
		'/dashboard', async (req, reply) => {
		
		if (req.session.pending2FA) {
			return reply.redirect('/2fa');
		}

		if (!req.isAuthenticated()) {
			return reply.redirect('/login');
		}

		return { message: 'Welcome to our server.', 
			user: {
				id: req.user.id,
				email: req.user.email,
				username: req.user.username,
				alias: req.user.alias,
				role: req.user.role
			}
		}	
	});
}

//fastify.listen({port: 3000}); -> 