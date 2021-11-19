var fs = require('fs');
var {Pool} = require('pg');

module.exports = async (bot) => {
	const db = new Pool();

	await db.query(`
		CREATE TABLE IF NOT EXISTS configs (
	    	id 				SERIAL PRIMARY KEY,
	        server_id   	TEXT,
	        prefix 			TEXT
	    );

	    -- React roles

	    CREATE TABLE IF NOT EXISTS reactcategories (
	    	id 				SERIAL PRIMARY KEY,
	    	hid 			TEXT,
	    	server_id		TEXT,
	    	name 			TEXT,
	    	description 	TEXT,
	    	roles 			TEXT[],
	    	posts 			TEXT[],
	    	single 			BOOLEAN,
	    	required 		TEXT
	    );

	    CREATE TABLE IF NOT EXISTS reactroles (
	    	id 				SERIAL PRIMARY KEY,
	    	server_id		TEXT,
	    	role_id 		TEXT,
	    	emoji 			TEXT,
	    	description 	TEXT
	    );

	    CREATE TABLE IF NOT EXISTS reactposts (
			id				SERIAL PRIMARY KEY,
			server_id		TEXT,
			channel_id		TEXT,
			message_id		TEXT,
			category 		TEXT,
			roles			TEXT[],
			page 			INTEGER,
	    	single 			BOOLEAN,
	    	required 		TEXT
		);

		-- Bundles

		CREATE TABLE IF NOT EXISTS bundles (
	    	id 				SERIAL PRIMARY KEY,
	    	hid 			TEXT,
	    	server_id		TEXT,
	    	name 			TEXT,
	    	description 	TEXT,
	    	roles 			TEXT[],
	    	assignable		BOOLEAN,
	    	pass 			TEXT
	    );

		CREATE TABLE IF NOT EXISTS selfroles (
	    	id 				SERIAL PRIMARY KEY,
	    	server_id		TEXT,
	    	role_id 		TEXT,
	    	description 	TEXT,
	    	assignable		BOOLEAN
	    );

		CREATE TABLE IF NOT EXISTS usages (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			whitelist 	TEXT[],
			blacklist 	TEXT[],
			type 		INTEGER
		);

		-- misc

		CREATE TABLE IF NOT EXISTS extras (
			id 			SERIAL PRIMARY KEY,
			key 		TEXT,
			val 		TEXT
		);
	`);
	
	bot.stores = {};
	var files = fs.readdirSync(__dirname);
	for(var file of files) {
		if(["__db.js", "migrations", "tmp.js"].includes(file)) continue;
		var name = file.replace(/\.js/i, "");

		bot.stores[name] = require(__dirname+'/'+file)(bot, db);
		if(bot.stores[name].init) bot.stores[name].init();
	}

	files = fs.readdirSync(__dirname + '/migrations');
	console.log(files);
	var version = parseInt((await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val || -1);
	if(files.length > version + 1) {
		for(var i = version + 1; i < files.length; i++) {
			if(!files[i]) continue;
			var migration = require(`${__dirname}/migrations/${files[i]}`);
			try {
				await migration(bot, db);
			} catch(e) {
				console.log(e);
				process.exit(1);
			}

			if(version == -1) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 0)`);
			else await db.query(`UPDATE extras SET val = $1 WHERE key = 'version'`, [i]);
		}
	}

	return db;
}