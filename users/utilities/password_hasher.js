import argon2 from 'argon2'

//self explanatory, function for hashing a valid password and another for validatin an input against an existing hash

export async function hashPassword(password) {
	return argon2.hash(password)
}

export async function verifyPassword(hash, password) {
	return argon2.verify(hash, password)
}