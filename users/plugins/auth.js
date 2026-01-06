import 'dotenv/config';
import fastifyPlugin from 'fastify-plugin';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import fs from 'fs';

async function authPlugin(fastify){


	// SESSION SETUP //

	fastify.register(fastifySecureSession, {
		//APPARENTLY, FASTIFY-SECURE-SESSION NEEDS A SECRET KEY, USE SSL TO GET IT
		//openssl rand 32 > secret-key
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

				//DATABASE STUFF GOES HERE

				return done(null, user);
			}
		)
	)
}

export default fastifyPlugin(authPlugin)