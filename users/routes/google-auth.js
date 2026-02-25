import fastifyPassport from '@fastify/passport'
import { registerChatUser } from '../utilities/chat_register.js'

export default async function (fastify){

	const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
			return reply.redirect(`${FRONTEND_URL}/auth?2fa=true`);
		}
	
		await req.logIn(user);
		registerChatUser(user);
		return reply.redirect(FRONTEND_URL);
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
			role: req.user.role,
			avatar: req.user.avatar || null,
			google_id: req.user.google_id || null,
			two_factor_enabled: req.user.two_factor_enabled || 0
		}
	}
	});
}

//fastify.listen({port: 3000}); -> 