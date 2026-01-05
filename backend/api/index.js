// Import the framework and instantiate it
import Fastify from 'fastify'
import path from 'path';
import { fileURLToPath } from 'url' ;
import { dirname, join } from 'path'
import setup_routes from './routes/routes_init.mjs';

const fastify = Fastify({
  logger: true
})

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);




async function start(){
	try {
	await fastify.listen({ port: 1231 , host: '0.0.0.0'});
	} catch (err) {
	fastify.log.error(err);
	process.exit(1);
	}
}



start();

