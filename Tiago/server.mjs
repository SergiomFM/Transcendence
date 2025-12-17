// Import the framework and instantiate it
import Fastify from 'fastify'
import path from 'path';
import { fileURLToPath } from 'url' ;
import { dirname, join } from 'path'
import fastifyStatic from '@fastify/static';
import view from '@fastify/view';
import ejs from 'ejs'
import proxy from '@fastify/http-proxy';
import home  from './routes/routes.mjs'
// import leiria  from './routes/leiria.mjs'


const fastify = Fastify({
  logger: true
})
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

//regist public files

fastify.register(fastifyStatic, { 
	root: path.join(__dirname, 'public'), 
	prefix: '/public/',
});

//register views 
await fastify.register(view, {
  engine: { ejs },
  root: path.join(__dirname, '/views'),
  prefix: '/views/',
  layout: false
})

//Service proxys

fastify.register(proxy, {
	upstream: 'http://Test:1234',
	prefix: '/test',
	rewritePrefix: '/test'
  });

fastify.register(proxy, {
	upstream: 'http://Auth:1235',
	prefix: '/auth',
	rewritePrefix: '/auth'
  });


  fastify.register(proxy, {
	upstream: 'http://Pong:1237',
	prefix: '/pong',
	rewritePrefix: '/pong'
  });


//Register routes

fastify.register(home);
// fastify.register(leiria);

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

