const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	server_id: { },
	name: { patch: true },
	description: { patch: true },
	roles: { patch: true },
	assignable: { patch: true },
	pass: { patch: true }
}

class Bundle extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data)
	}

	async fetchRoles() {
		if(!this.guildRoles) {
			var guild = this.store.bot.guilds.resolve(this.server_id);
			var groles = await guild.roles.fetch();
			this.guildRoles = this.roles.map(r => groles.cache.find(rl => r == rl.id)).filter(x => x);
			if(this.roles.length > this.guildRoles.length) {
				this.roles = this.guildRoles.map(r => r.id);
				await this.save();
			}
		}

		return this.guildRoles;
	}
}

class BundleStore extends DataStore {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async init() {
		await this.db.query(`
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
		`);
	}

	async create(server, data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO bundles (
				server_id,
				name,
				description,
				roles,
				assignable,
				pass
			) VALUES (find_unique('bundles'), $1, $2, $3, $4, $5, $6)
			RETURNING id`,
			[server, data.name, data.description, data.roles || [], data.assignable || false, data.pass]);
		} catch(e) {
			console.log(e);
	 		return rej(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO bundles (
					hid,
					server_id,
					name,
					description,
					roles,
					assignable,
					pass
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[hid, server, data.name, data.description, data.roles || [], data.assignable || false, data.pass]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM bundles WHERE server_id = $1 AND hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return rej(e.message);
		}
		
		if(data.rows && data.rows[0]) {
			var bundle = new Bundle(this, KEYS, data.rows[0]);
			await bundle.fetchRoles();

			return bundle;
		} else return new Bundle(this, KEYS, { server_id: server });
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM bundles WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return rej(e.message);
		}
		
		if(data.rows && data.rows[0]) new Bundle(this, KEYS, data.rows[0]);
		else return new Bundle(this, KEYS, { });
	}

	async getByRole(server, role) {
		return new Promise(async (res, rej) => {
			try {
				var bundles = await this.getAll(server);
			} catch(e) {
				return rej(e);
			}

			bundles = bundles.filter(c => c.roles.find(r => r.role_id == role) || c.raw_roles.find(r => r == role));
			if(bundles[0]) res(bundles);
			else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM bundles WHERE server_id = $1`,[server]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			if(data.rows && data.rows[0]) {
				var guild = this.bot.guilds.resolve(server);
				var groles = await guild.roles.fetch();
				for(var i = 0; i < data.rows.length; i++) {
					data.rows[i].raw_roles = data.rows[i].roles;
					data.rows[i].roles = data.rows[i].roles.map(r => groles.cache.find(rl => rl.id == r)).filter(x => x);
				}
				res(data.rows)
			} else res(undefined);
		})
	}

	async update(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE bundles SET ${Object.keys(data).map((k, i) => k+"=$"+(i+3)).join(",")} WHERE server_id = $1 AND hid = $2`,[server, hid, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			var bundle = await this.get(server, hid, true);
			res(bundle);
		})
	}

	async delete(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM bundles WHERE server_id = $1 AND hid = $2`, [server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			super.delete(`${server}-${hid}`);
			res();
		})
	}

	async deleteAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var bundles = await this.getAll(server);
				await this.db.query(`DELETE FROM bundles WHERE server_id = $1`, [server]);
			} catch(e) {
				console.log(e);
				return rej(e.message || e);
			}

			for(bundle of bundles) super.delete(`${server}-${bundle.hid}`);
			res();
		})
	}
}

module.exports = (bot, db) => new BundleStore(bot, db);