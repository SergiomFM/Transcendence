import QRCode from "qrcode";
import { generate2FASecret, verify2FA, generateRecoveryCodes, verifyRecoveryCode } from "../utilities/2FA.js";

//begins 2FA setup and generates QR code
export default async function twoFARoutes(fastify){

	fastify.post("/auth/2fa/setup", async (req, reply) => {
		if (!req.isAuthenticated()) {
			return reply.code(401).send({ error: "Unauthorized" });

		}

		const user = req.user;

		//disallow duplicate 2FA setup
		if (user.two_factor_enabled) {
			return reply.code(400).send({ error: "2FA already enabled" });
		}

		const secret = generate2FASecret(user.email);

		fastify.users.setTemp2FASecret.run(secret.base32, user.id);

		const qr = await QRCode.toDataURL(secret.otpauth_url);

		reply.send({
			message: "Initiating 2FA setup...",
			qr,
			otpauth_url: secret.otpauth_url
		});
	});


	//confirm and activate 2FA setup
	fastify.post("/auth/2fa/confirm", async(req, reply) => {
		if (!req.isAuthenticated()) {
			return reply.code(401).send({ error: "Unauthorized user."});
		}

		const { token } = req.body;
		if (!token) {
			return reply.code(400).send({ error: "Missing token." });
		}

		const userId = req.user.id;

		const row = fastify.users.getTemp2FASecret.get(userId);
		if (!row || !row.two_factor_temp_secret) {
			return reply.code(400).send({ error: "No 2FA setup in progress." });
		}

		const valid = verify2FA(token, row.two_factor_temp_secret);

		if (!valid) {
			return reply.code(400).send({ error: "Invalid authentication code." });
		}

		fastify.users.enable2FA.run(row.two_factor_temp_secret, userId);
		
		fastify.users.recovery.deleteByUser.run(userId);
		
		const recoveryCodes = await generateRecoveryCodes();

		for (const code of recoveryCodes) {
			fastify.users.recovery.insert.run(userId, code.hash);
		}

		reply.send({ 
			message: "Two-factor authentication enabled.",
			recovery_codes: recoveryCodes.map(c => c.code)
		});
	});

	fastify.post("/auth/2fa/verify", async (req, reply) => {
		const { token } = req.body;
		const userId = req.session.pending2FA;

		if (!userId) {
			return reply.code(400).send({ error: "No pending 2FA verification."});
		}

		if (!token) {
			return reply.code(400).send({ error: "Missing authentication code."});
		}

		const user = fastify.users.findById.get(userId);

		if (!user || !user.two_factor_enabled){
			return reply.code(400).send({ error: "Invalid session."});
		}

		const recovery = fastify.users.recovery.findByUser.all(userId);

		let valid = verify2FA(token, user.two_factor_secret);
		let usedRecovery = null;

		if (!valid) {
			usedRecovery = await verifyRecoveryCode(token, recovery);

			if (!usedRecovery) {
				return reply.code(401).send({ error: "Invalid authentication code." });
			}
		}

		if (usedRecovery) {
			fastify.users.recovery.markUsed.run(usedRecovery.id);
		}

		delete req.session.pending2FA;
		await req.logIn(user);

		reply.send({ message: "2FA verification successful!"});
	})
}