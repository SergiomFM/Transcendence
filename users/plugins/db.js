import fp from 'fastify-plugin'
import Database from 'better-sqlite3'
import fs from 'fs' //filesystem
import path from 'path' //path

//ensure the database folder exists, connect it to the path using join

async function dbPlugin(fastify){

	const dbDirectory = '/app/database'
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
		avatar TEXT,
		google_id TEXT UNIQUE,
		password_hash TEXT,
		two_factor_enabled INTEGER DEFAULT 0,
		two_factor_secret TEXT,
		two_factor_temp_secret TEXT,
		role TEXT DEFAULT 'user',
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run()

	// Migration: add avatar column if it doesn't exist yet
	const columns = db.prepare(`PRAGMA table_info(users)`).all()
	if (!columns.find(c => c.name === 'avatar')) {
		db.prepare(`ALTER TABLE users ADD COLUMN avatar TEXT`).run()
		fastify.log.info('Added avatar column to users table')
	}
	
	db.prepare(` CREATE TABLE IF NOT EXISTS recovery_codes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		code_hash TEXT NOT NULL,
		used INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`).run()

	db.prepare(`CREATE TABLE IF NOT EXISTS player_profiles (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL UNIQUE,
		display_name TEXT NOT NULL,
		bio TEXT,
		avatar_url TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`).run()

	db.prepare(`CREATE TABLE IF NOT EXISTS match_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		player1_id TEXT,
		player2_id TEXT,
		player1_score INTEGER NOT NULL,
		player2_score INTEGER NOT NULL,
		winner_id TEXT,
		played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE)`).run()

	// Migration: recreate match_history if columns are NOT NULL (old schema)
	const matchCols = db.prepare(`PRAGMA table_info(match_history)`).all()
	const player1Col = matchCols.find(c => c.name === 'player1_id')
	if (player1Col && player1Col.notnull === 1) {
		db.prepare(`DROP TABLE match_history`).run()
		db.prepare(`CREATE TABLE match_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			player1_id TEXT,
			player2_id TEXT,
			player1_score INTEGER NOT NULL,
			player2_score INTEGER NOT NULL,
			winner_id TEXT,
			played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE)`).run()
		fastify.log.info('Migrated match_history table to allow guest players')
	}

	db.prepare(`CREATE TABLE IF NOT EXISTS friend_requests (
		id TEXT PRIMARY KEY,
		sender_id TEXT NOT NULL,
		receiver_id TEXT NOT NULL,
		status TEXT DEFAULT 'pending',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE)`).run()

	db.prepare(`CREATE TABLE IF NOT EXISTS friends (
		user_id TEXT NOT NULL,
		friend_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, friend_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE)`).run()

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

		//update avatar (base64 webp)
		updateAvatar: db.prepare(`
			UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
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

			//PLAYER_PROFILE
		fastify.decorate('profiles', {
			findByUserId: db.prepare(`
				SELECT p.*, u.avatar FROM player_profiles p
				JOIN users u ON u.id = p.user_id
				WHERE p.user_id = ?
				`),

			createProfile: db.prepare(`
				INSERT INTO player_profiles (id, user_id, display_name)
				VALUES (?, ?, ?)
				`),

			updateDisplayName: db.prepare(`
				UPDATE player_profiles
				SET display_name = ?, updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				`),

			updateBio: db.prepare(`
				UPDATE player_profiles
				SET bio = ?, updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				`),

			updateAvatar: db.prepare(`
				UPDATE player_profiles
				SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				`),

			// Search profiles by display_name (case-insensitive, partial match), excluding self
			searchByDisplayName: db.prepare(`
				SELECT p.*, u.avatar FROM player_profiles p
				JOIN users u ON u.id = p.user_id
				WHERE p.display_name LIKE ? AND p.user_id != ?
				ORDER BY p.display_name ASC
				LIMIT 20
				`)
			})

		//MATCH HISTORY
	fastify.decorate('matches', {
		insert: db.prepare(`
			INSERT INTO match_history (player1_id, player2_id, player1_score, player2_score, winner_id)
			VALUES (?, ?, ?, ?, ?)
			`),

		countWins: db.prepare(`
			SELECT COUNT(*) as wins FROM match_history WHERE winner_id = ?
			`),

		countLosses: db.prepare(`
			SELECT COUNT(*) as losses FROM match_history
			WHERE (player1_id = ? OR player2_id = ?) AND (winner_id IS NULL OR winner_id != ?)
			`),

		// Returns all matches for a given user, joined with opponent profile info, newest first
		getByUserId: db.prepare(`
			SELECT
				mh.id,
				mh.player1_id,
				mh.player2_id,
				mh.player1_score,
				mh.player2_score,
				mh.winner_id,
				mh.played_at,
				p1.display_name AS player1_display_name,
				p1.avatar_url   AS player1_avatar_url,
				u1.avatar        AS player1_avatar,
				p2.display_name AS player2_display_name,
				p2.avatar_url   AS player2_avatar_url,
				u2.avatar        AS player2_avatar
			FROM match_history mh
			LEFT JOIN player_profiles p1 ON p1.user_id = mh.player1_id
			LEFT JOIN users u1 ON u1.id = mh.player1_id
			LEFT JOIN player_profiles p2 ON p2.user_id = mh.player2_id
			LEFT JOIN users u2 ON u2.id = mh.player2_id
			WHERE mh.player1_id = ? OR mh.player2_id = ?
			ORDER BY mh.played_at DESC
			LIMIT 50
			`),
		})

		//FRIENDS AND FRIENDS LIST
	fastify.decorate('friends', {
			sendRequest: db.prepare(`
				INSERT INTO friend_requests (id, sender_id, receiver_id)
				VALUES (?, ?, ?)
				`),

			// Fetch a request by its id
			getRequestById: db.prepare(`
				SELECT * FROM friend_requests WHERE id = ?
				`),

			// Fetch a request between two users in either direction (for duplicate check)
			getRequestBetween: db.prepare(`
				SELECT * FROM friend_requests
				WHERE (sender_id = ? AND receiver_id = ?)
				   OR (sender_id = ? AND receiver_id = ?)
				`),

			// Legacy: kept for backwards compatibility (sender -> receiver)
			getRequest: db.prepare(`
				SELECT * FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ?
				`),

			getIncomingRequests: db.prepare(`
				SELECT r.*, p.display_name, p.avatar_url, u.avatar
				FROM friend_requests r
				JOIN player_profiles p ON p.user_id = r.sender_id
				JOIN users u ON u.id = r.sender_id
				WHERE r.receiver_id = ? AND r.status = 'pending'
				`),

			getSentRequests: db.prepare(`
				SELECT r.*, p.display_name, p.avatar_url, u.avatar
				FROM friend_requests r
				JOIN player_profiles p ON p.user_id = r.receiver_id
				JOIN users u ON u.id = r.receiver_id
				WHERE r.sender_id = ? AND r.status = 'pending'
				`),

			// Get sent request to a specific receiver (for cancel)
			getSentRequestTo: db.prepare(`
				SELECT * FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
				`),

			updateRequestStatus: db.prepare(`
				UPDATE friend_requests SET status = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				`),

			deleteRequest: db.prepare(`
				DELETE FROM friend_requests WHERE id = ?
				`),

			addFriend: db.prepare(`
				INSERT INTO friends (user_id, friend_id) VALUES (?, ?)
				`),

			removeFriend: db.prepare(`
				DELETE FROM friends WHERE user_id = ? AND friend_id = ?
				`),

			// Check if two users are already friends
			isFriend: db.prepare(`
				SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
				`),

			listFriends: db.prepare(`
				SELECT p.*, u.avatar
				FROM friends f
				JOIN player_profiles p ON p.user_id = f.friend_id
				JOIN users u ON u.id = f.friend_id
				WHERE f.user_id = ?
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