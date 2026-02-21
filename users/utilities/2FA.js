import speakeasy from "speakeasy";
import argon2 from "argon2";
import crypto from "node:crypto";

//speakeasy consists of generating a TOTP, Time based One Time Password
//2FA secrets generated with speakeasy go into the two_factor_temp_secret until user is validated through 2FA
//this function only generates a secret, it does nothing else
export function generate2FASecret(email) {
	return speakeasy.generateSecret({
		name: "Transcendence",
		length: 20,
		issuer: "GofasInc"
	});
}

export function verify2FA(token, secret){
	return speakeasy.totp.verify({
		secret,
		encoding: "base32",
		token,
		window: 1
	});
}

//like everything in user registration/validation, things go wrong sometimes(phone lost, app deleted, inevitable collapse of society). in this case, recovery codes can be good to at least regain control of everything 
export async function generateRecoveryCodes(count = 8){
	const codes = [];

	for (let i = 0; i < count; i++) {
		const code = crypto.randomBytes(5).toString("hex");
		const hash = await argon2.hash(code);

		codes.push({
			code,
			hash,
			used: false
		});
	}

	return codes;
}

//verify recovery codes
export async function verifyRecoveryCode(code, storedCodes) {
	for (const entry of storedCodes) {
		const valid = await argon2.verify(entry.code_hash, code);
		if (valid) {
			if (entry.used) return { alreadyUsed: true };
			return {
				id: entry.id,
				hash: entry.code_hash
			};
		}
	}
	return null;
}


