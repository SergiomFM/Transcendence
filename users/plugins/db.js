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
		two_factor_temp_secret TEXT,
		role TEXT DEFAULT 'user',
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run()
	
	db.prepare(` CREATE TABLE IF NOT EXISTS recovery_codes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		code_hash TEXT NOT NULL,
		used INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`).run()


		fastify.log.info('Ensured Database schema...')
		
		
		//link database to fastify, allowing it to be discovered by routes, plugins and hooks
		
		fastify.decorate('db', db)

		//helper functions, all of them consist of queries made to sqlite
		
		//search for previous logins

		fastify.decorate('users', {
			
			//USERS
			findByGoogleId: db.prepare(`SELECT * FROM users WHERE google_id = ?`),
			findByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
			findById: db.prepare(`SELECT * FROM users WHERE id = ?`),
			findByUsername: db.prepare(`SELECT * FROM users WHERE username = ?`),
		
			//create a user using google
			createGoogleUser: db.prepare(`
				INSERT INTO users (id, email, alias, google_id)
				VALUES (?, ?, ?, ?)
			`),

			//create a local user, to use with password
			createLocalUser: db.prepare(`
				INSERT INTO users (id, username, email, alias, password_hash)
				VALUES (?, ?, ?, ?, ?)
			`),

			//2FA (to be done after local password, FORCE GOOGLE USERS TO UNDERGO IT TOO)
			enable2FA: db.prepare(`
				UPDATE users SET two_factor_enabled = 1, two_factor_secret = ?, two_factor_temp_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`),

			disable2FA: db.prepare(`
				UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_temp_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`),

			setTemp2FASecret: db.prepare(`
				UPDATE users SET two_factor_temp_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`),

			getTemp2FASecret: db.prepare(`
				SELECT two_factor_temp_secret FROM users WHERE id = ?
			`),

			get2FASecret: db.prepare(`
				SELECT two_factor_secret FROM users WHERE id = ?
			`),

			//create and set password in database
			setPassword: db.prepare(`
				UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`),

			//update display name
			updateAlias: db.prepare(`
				UPDATE users SET alias = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`),

			//RECOVERY CODES

			recovery: {
				insert: db.prepare(`
					INSERT INTO recovery_codes (user_id, code_hash)
					VALUES (?, ?)
				`),

				findByUser: db.prepare(`
					SELECT * FROM recovery_codes WHERE user_id = ?
				`),

				markUsed: db.prepare(`
					UPDATE recovery_codes SET used = 1 WHERE id = ?
				`),

				deleteByUser: db.prepare(`
					DELETE FROM recovery_codes WHERE user_id = ?
				`)
			}
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