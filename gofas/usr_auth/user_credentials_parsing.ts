function HelloWorld(woa){

	return "Hello, ".concat(woa, "!");
}

const message = HelloWorld("World");
console.log(message);


//Username:

// no special characters besides underscore "_"
// no spaces
// between 3 and 20 length
// numbers allowed

//regex for all of the above: /^[a-zA-Z0-9_]{3,20}$/


//Password: 

// minimum 8 length
// at least one uppercase
// at least one lowercase
// at least one number
// at least one special character
// 
// regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/


//Email:

// usual rules apply...
//
// regex: /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/