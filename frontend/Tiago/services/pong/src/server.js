"use strict";

// Client disconnection function
function clientDisconnection()
{
	console.log('A client has disconnected');
}

// Client message recieving function
function clientMessage(rawMessage)
{
	const message = rawMessage.toString();
	console.log('Received:', message);
	connection.socket.send(`Server says: ${message}`);
}

// Client connection function
function clientConnection(client, request)
{
	console.log('A player has connected');

	connection.socket.on('message', clientMessage);
	connection.socket.on('close', clientDisconnection);
}

//Importing Fastify and Fastify/websocket
const Fastify = require("fastify")();
const Websocket = require("@fastify/websocket");

//Instantiating Fastify and registering WebSocket
const server = Fastify();
server.register(Websocket);

//Defining a WebSocket route
server.get('/', { websocket: true }, clientConnection)


server.get('/pong', async function handler(request, reply) {

	reply.view('test_view.ejs')
	return reply
})

server.listen({ port: 1237 }, (error, address) => {
	if (error) {
		server.log.error(error);
		process.exit(1);
	}
	server.log.info(`Server listening on ${address}`);
});