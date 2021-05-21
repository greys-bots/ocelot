const {Collection} = require("discord.js");

class BundleStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO bundles (
					hid,
					server_id,
					name,
					description,
					roles,
					assignable
				) VALUES ($1, $2, $3, $4, $5, $6)`,
				[hid, server, data.name, data.description, data.roles || [], data.assignable || false]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, hid));
		})
	}

	async index(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO bundles (
					hid,
					server_id,
					name,
					description,
					roles,
					assignable
				) VALUES ($1, $2, $3, $4, $5, $6)`,
				[hid, server, data.name, data.description, data.roles || [], data.assignable || false]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM bundles WHERE server_id = $1 AND hid = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var bundle = data.rows[0];
				bundle.raw_roles = bundle.roles;
				bundle.roles = await this.bot.stores.selfRoles.getByRowIDs(server, bundle.roles);
				if(bundle.raw_roles.length > bundle.roles.length) {
					bundle.raw_roles = bundle.roles.map(r => r.id);
					await this.update(server, hid, {roles: bundle.raw_roles});
				}
				this.set(`${server}-${hid}`, bundle);
				res(bundle)
			} else res(undefined);
		})
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
				for(var i = 0; i < data.rows.length; i++) {
					data.rows[i].raw_roles = data.rows[i].roles;
					data.rows[i].roles = await this.bot.stores.selfRoles.getByRowIDs(server, data.rows[i].roles);
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