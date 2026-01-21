import Fastify from 'fastify';
import fastifyPassport from 'fastify-passport';
import fastifySecureSession from '@fastify/secure-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import fs from 'fs';
//import speakeasy from "speakeasy";
//import QRCode from "qrcode";

const fastify = Fastify({logger: true});

// SESSION SETUP //

fastify.register(fastifySecureSession, {
	//APPARENTLY, FASTIFY-SECURE-SESSION NEEDS A SECRET KEY, USE SSL TO GET IT
	//openssl rand -base64 32 > secret-key
	//REASON: Fastify doesn't store sessions in memory — it stores them in an encrypted cookie on the client.
	key: fs.readFileSync('./secret-key'),
	cookie:{
		path: '/'
	}
});

// PASSPORT SETUP //

fastify.register(fastifyPassport.initialize());
fastify.register(fastifyPassport.secureSession());

fastifyPassport.registerUserSerializer(async (user) => user);

fastifyPassport.registerUserDeserializer(async (user) => user);

// ACTUAL USE OF PASSPORT, IN SYNC WITH GOOGLE OAUTH //

fastifyPassport.use(
		'google',
	new GoogleStrategy(

		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: 'http://localhost:3000/auth/google/callback'
		},
		async (accessToken, refreshToken, profile, done) => {

			const user = {
				id: profile.id,
				name: profile.displayName,
				email: profile.emails?.[0]?.value
			};
			
			return done(null, user);
		}
	)
);

// ROUTE AUTHENTICATION

fastify.get(

	'/auth/google',
	fastifyPassport.authenticate('google', {
		scope: ['profile', 'email']
	})
);

fastify.get(

	'/auth/google/callback',
	fastifyPassport.authenticate('google', {
		failureRedirect: '/login',
		successRedirect: '/dashboard'
	})
);

// PROTECTED ROUTE (REASON FOR EXISTENCE TBD)

fastify.get('dashboard', async (req, reply) => {

	if (!req.isAuthenticated()) {
		reply.redirect('/auth/google');
		return;
	}
	return {message: 'Welcome to our server.', user: req.user};
});

//START THE SERVER LISTENING ON PORT 3000 (VERY IMPORTANT)
fastify.listen({port: 3000});