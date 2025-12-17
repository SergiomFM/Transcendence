// Import the framework and instantiate it
import Fastify from 'fastify'
import path from 'path';
import { fileURLToPath } from 'url' ;
import { dirname, join } from 'path'
import fastifyStatic from '@fastify/static';
import view from '@fastify/view';
import ejs from 'ejs'

const fastify = Fastify({
  logger: true
})
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//register



await fastify.register(view, {
  engine: { ejs },
  root: path.join(__dirname, '../../views'),
  prefix: '/views/',
  layout: false
})


//Gets
fastify.get('/test', async function handler (request, reply) {

	reply.view('test_view.ejs') 
	return reply
})


// fastify.get('/game/scripts/render_game.mjs', async function handler (request, reply) {

// 	return reply.sendFile('/scripts/render_game.mjs');
// 	return reply
// })


// Run the server!

async function start(){
	try {
	await fastify.listen({ port: 1234 , host: '0.0.0.0'});
	} catch (err) {
	fastify.log.error(err);
	process.exit(1);
	}
}

start();

