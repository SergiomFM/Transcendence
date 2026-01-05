// Import the framework and instantiate it
import Fastify from 'fastify'
import path from 'path';
import { fileURLToPath } from 'url' ;
import { dirname, join } from 'path'
import fastifyStatic from '@fastify/static';
import view from '@fastify/view';
import ejs from 'ejs'
import proxy from '@fastify/http-proxy';

const fastify = Fastify({
  logger: true
})
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//register views

fastify.register(fastifyStatic, { root: path.join(__dirname, 'public'), prefix: '/public/'});

await fastify.register(view, {
  engine: { ejs },
  root: path.join(__dirname, 'views'),
  prefix: '/views/',
  layout: false
})

// Proxys

fastify.register(proxy, {
	upstream: 'http://localhost:1234',
	prefix: '/game',
	rewritePrefix: '/game'
  });

//Gets

fastify.get('/', async function handler (request, reply) {

	reply.view('home.ejs') 
	return reply
})





// fastify.get('/lleiria-ball.png', async function handler (request, reply) {

// 	return reply.sendFile('lleiria-ball.png');

	
// 	})


// Run the server!

async function start(){
	try {
	await fastify.listen({ port: 4443 , host: '0.0.0.0'});
	} catch (err) {
	fastify.log.error(err);
	process.exit(1);
	}
}

start();

