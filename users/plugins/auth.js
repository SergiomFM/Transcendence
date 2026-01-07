import 'dotenv/config';
import fastifyPlugin from 'fastify-plugin';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'node:crypto'
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

	fastifyPassport.registerUserSerializer(async (user) => user.id);

	fastifyPassport.registerUserDeserializer(async (id, req) => {
		return fastify.users.findById.get(id)
	});

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

				//troubleshooting tool, can remove later
				console.log('GOOGLE PROFILE:', JSON.stringify(profile, null, 2))

				try {

					const googleId = profile.id
					const email = profile.emails[0].value
					const alias = profile.displayName
					let user = fastify.users.findByGoogleId.get(googleId)
					if (!user) {
						user = fastify.users.findByEmail.get(email)

						if (user) {
							fastify.users.updateAlias.run(alias, user.id)
						}
						else {
							const id = crypto.randomUUID()
							fastify.users.createGoogleUser.run(id, email, alias, googleId)
							user = fastify.users.findById.get(id)
						}
					}
					return done(null, user)
				}
					catch (err){
						return done(err)
					}
			}
		)
	)
}

export default fastifyPlugin(authPlugin)