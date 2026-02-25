//self explanatory, function for hashing a valid password and another for validating an input against an existing hash
//Uses Bun's built-in argon2id implementation (no native addon needed)

export async function hashPassword(password) {
	return Bun.password.hash(password, { algorithm: "argon2id" })
}

export async function verifyPassword(hash, password) {
	return Bun.password.verify(password, hash)
}