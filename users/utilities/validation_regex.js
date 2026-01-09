export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
export const EMAIL_REGEX = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/

//Username:

// no special characters besides underscore "_"
// no spaces
// between 3 and 20 length
// numbers allowed

//Password: 

// minimum 8 length
// at least one uppercase
// at least one lowercase
// at least one number
// at least one special character from allowed characters (@ $ ! % * ? &)

//Email:

// must contain exactly one @
// must have a domain
// subdomains are allowed
// must not have spaces
// must not have special characters

export function validateUsername(username) {
	return USERNAME_REGEX.test(username)
}

export function validatePassword(password) {
	return PASSWORD_REGEX.test(password)
}

export function validateEmail(email){
	return EMAIL_REGEX.test(email)
}