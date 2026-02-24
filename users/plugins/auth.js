import "dotenv/config";
import fastifyPlugin from "fastify-plugin";
import fastifyPassport from "@fastify/passport";
import fastifySecureSession from "@fastify/secure-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "node:crypto";
import fs from "fs";

async function downloadImageAsBase64(url) {
	try {
		// Request a reasonably sized image from Google (256px)
		const sizedUrl = url.replace(/=s\d+(-c)?$/, '') + '=s256';
		console.log("Downloading Google profile photo:", sizedUrl);
		const response = await fetch(sizedUrl);
		if (!response.ok) {
			console.log("Google photo fetch failed:", response.status, response.statusText);
			return null;
		}
		const contentType = response.headers.get("content-type") || "image/jpeg";
		const buffer = Buffer.from(await response.arrayBuffer());
		const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;
		console.log("Google photo downloaded, size:", buffer.length, "bytes, base64 length:", base64.length);
		return base64;
	} catch (err) {
		console.log("Google photo download error:", err);
		return null;
	}
}

async function authPlugin(fastify) {
	// SESSION SETUP //

	fastify.register(fastifySecureSession, {
		//APPARENTLY, FASTIFY-SECURE-SESSION NEEDS A SECRET KEY, USE SSL TO GET IT
		//openssl rand 32 > secret-key
		//REASON: Fastify doesn't store sessions in memory — it stores them in an encrypted cookie on the client.
		key: fs.readFileSync("/app/database/secret-key"),
		cookie: {
			path: "/",
		},
	});

	// PASSPORT SETUP //

	fastify.register(fastifyPassport.initialize());
	fastify.register(fastifyPassport.secureSession());

	fastifyPassport.registerUserSerializer(async (user) => user.id);

	fastifyPassport.registerUserDeserializer(async (id, req) => {
		return fastify.users.findById.get(id);
	});

	// ACTUAL USE OF PASSPORT, IN SYNC WITH GOOGLE OAUTH //

	fastifyPassport.use(
		"google",
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL: process.env.GOOGLE_CALLBACK_URL,
			},
			async (accessToken, refreshToken, profile, done) => {
				//troubleshooting tool, can remove later
				console.log("GOOGLE PROFILE:", JSON.stringify(profile, null, 2));

				try {
				const googleId = profile.id;
				const email = profile.emails[0].value.toLowerCase().trim();
				const alias = profile.displayName;
				const photoUrl = profile.photos?.[0]?.value || null;
				const photo = photoUrl ? await downloadImageAsBase64(photoUrl) : null;
				const hasValidAvatar = (avatar) => avatar && avatar.startsWith('data:image/');
				let user = fastify.users.findByGoogleId.get(googleId);
				if (!user) {
					user = fastify.users.findByEmail.get(email);

					if (user) {
						fastify.users.updateAlias.run(alias, user.id);
						if (photo) {
							fastify.users.updateGoogleAvatar.run(photo, user.id);
						}
						if (!hasValidAvatar(user.avatar) && photo) {
							fastify.users.updateAvatar.run(photo, user.id);
						}
					} else {
						const id = crypto.randomUUID();
						fastify.users.createGoogleUser.run(id, email, alias, googleId, photo);
						user = fastify.users.findById.get(id);
						if (photo) {
							fastify.users.updateGoogleAvatar.run(photo, user.id);
						}

						fastify.profiles.createProfile.run(
							crypto.randomUUID(),
							user.id,
							alias,
						);
					}
				} else {
					// Always keep google_avatar up to date
					if (photo) {
						fastify.users.updateGoogleAvatar.run(photo, user.id);
					}
					if (!hasValidAvatar(user.avatar) && photo) {
						fastify.users.updateAvatar.run(photo, user.id);
					}
				}
					if (user && !user.is_active) {
						return done(null, false, { message: "Account disabled" });
					}
					return done(null, user);
				} catch (err) {
					return done(err);
				}
			},
		),
	);
}

export default fastifyPlugin(authPlugin);
