import fp from 'fastify-plugin'
import Database from 'better-sqlite3'
import fs from 'fs' //filesystem
import path from 'path' //path

//ensure the database folder exists, connect it to the path using join

async function dbPlugin(fastify){

	const dbDirectory = path.join(process.cwd(), 'database')
	if (!fs.existsSync(dbDirectory)) {

		fs.mkdirSync(dbDirectory)
	}
	
	const dbPath = path.join(dbDirectory, 'app.db')

	//open the database file if it exists, create one if it doesn't
	
	const db = new Database(dbPath)
	db.pragma('journal_mode = WAL') 
	//"write ahead log", main advantage is that concurrent read/writes are now accepted
	//and makes queries faster by not locking the database during inserts

	fastify.log.info('Connected to SQLite database...')
	
	//initialize schema, as per the structuring in gofas/databse-structure (VERY SPECIFIC SYNTAX, DO NOT TOUCH)
	
	db.prepare(`  CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE,
		email TEXT UNIQUE NOT NULL,
		alias TEXT,
		google_id TEXT UNIQUE,
		password_hash TEXT,
		two_factor_enabled INTEGER DEFAULT 0,
		two_factor_secret TEXT,
		role TEXT DEFAULT 'user',
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run()
		
		fastify.log.info('Ensured Database schema...')
		
		
		//link database to fastify, allowing it to be discovered by routes, plugins and hooks
		
		fastify.decorate('db', db)

		//helper functions
		
		//search for previous logins

		fastify.decorate('users', {
			findByGoogleId: db.prepare(`SELECT * FROM users WHERE google_id = ?`),
			findByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
			findById: db.prepare(`SELECT * FROM users WHERE id = ?`),
		
			//create a user using google
			createGoogleUser: db.prepare(`
				INSERT INTO users (id, email, alias, google_id)
				VALUES (?, ?, ?, ?)
			`),


			updateAlias: db.prepare(`
				UPDATE users SET alias = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`)
		})
		
		//shutdown if necessary, avoiding file corruption(unsure how important this is but a clean shutdown avoids issues...)
		
		fastify.addHook('onClose', (instance, done) => {
			
			fastify.log.info('Database shutting down...')
			db.close()
			done()
		})
}

//wrap up plugin for fastify, export as well

export default fp(dbPlugin)