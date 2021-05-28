const {Collection} = require("discord.js");

class ReactRoleStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async init() {
		this.bot.on('roleDelete', async role => {
			var rr = await this.getRaw(role.guild.id, role.id);
			if(!rr) return;
			await this.delete(role.guild.id, role.id);
			var categories = await this.bot.stores.reactCategories.getByRole(role.guild.id, rr.id);
			if(categories?.[0]) {
				for(var c of categories) await this.bot.stores.reactCategories.get(c.server_id, c.hid); //auto-updates
			}
		})
	}

	async create(server, role, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				this.db.query(`INSERT INTO reactroles (
					server_id,
			    	role_id,
			    	emoji,
			    	description
				) VALUES ($1,$2,$3,$4)`,
				[server, role, data.emoji || "", data.description || ""])
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, role));
		})
	}

	async index(server, role, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				this.db.query(`INSERT INTO reactroles (
					server_id,
			    	role_id,
			    	emoji,
			    	description
				) VALUES ($1,$2,$3,$4)`,
				[server, role, data.emoji || "", data.description || ""])
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, role) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1 AND role_id = $2`,[server, role]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				try {
					var guild = await this.bot.guilds.fetch(server);
				} catch(e) {
					console.log(e);
					return rej(e.message);
				}
				data.rows[0].raw = await guild.roles.cache.find(r => r.id == data.rows[0].role_id);
				if(!data.rows[0].raw) {
					await this.delete(server, data.rows[0].role_id);
					return res(undefined);
				}
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getRaw(server, role) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1 AND role_id = $2`,[server, role]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getByReaction(server, emoji) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1 AND emoji = $2`,[server, emoji]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				try {
					var guild = await this.bot.guilds.fetch(server);
				} catch(e) {
					console.log(e);
					return rej(e.message);
				}
				data.rows[0].raw = await guild.roles.fetch(data.rows[0].role_id);
				if(!data.rows[0].raw) {
					await this.delete(server, data.rows[0].role_id);
					return res(undefined);
				}
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getByRowID(server, id) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1 AND id = $2`,[server, id]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				try {
					var guild = await this.bot.guilds.fetch(server);
				} catch(e) {
					console.log(e);
					return rej(e.message);
				}
				data.rows[0].raw = await guild.roles.fetch(data.rows[0].role_id);
				if(!data.rows[0].raw) {
					await this.delete(server, data.rows[0].role_id);
					return res(undefined);
				}
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1`,[server]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows && data.rows[0]) {
				try {
					var guild = await this.bot.guilds.fetch(server);
				} catch(e) {
					console.log(e);
					return rej(e.message);
				}
				for(var i = 0; i < data.rows.length; i++) {
					data.rows[i].raw = await guild.roles.fetch(data.rows[i].role_id);
					if(!data.rows[i].raw) {
						await this.delete(server, data.rows[i].role_id);
						data.rows[i] = undefined;
					}
				}
				
				res(data.rows.filter(x => x != undefined));
			} else res(undefined);
		})
	}

	async getByRowIDs(server, ids) {
		return new Promise(async (res, rej) => {
			if(ids.length == 0) return res([]);

			try {
				var data = await this.db.query(`SELECT * FROM reactroles WHERE server_id = $1 AND id = ANY($2)`,[server, ids]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				try {
					var guild = await this.bot.guilds.fetch(server);
				} catch(e) {
					console.log(e);
					return rej(e.message);
				}
				if(!guild) return rej("Guild not found");
				for(var i = 0; i < data.rows.length; i++) {
					data.rows[i].raw = await guild.roles.fetch(data.rows[i].role_id);
					if(!data.rows[i].raw) {
						await this.delete(server, data.rows[i].role_id);
						data.rows[i] = undefined;
					}
				}
				
				res(data.rows.filter(x => x != undefined));
			} else res(undefined);
		})
	}

	async update(server, role, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE reactroles SET ${Object.keys(data).map((k, i) => k+"=$"+(i+3)).join(",")} WHERE server_id = $1 AND role_id = $2`,[server, role, ...Object.values(data)]);
				var nrole = await this.get(server, role);
				console.log(nrole);
				var posts = await this.bot.stores.reactPosts.getByRole(server, nrole.id);
				console.log(posts);
				if(posts) for(var post of posts) this.bot.stores.reactPosts.update(server, post.message_id, {roles: post.raw_roles});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			res();
		})
	}

	async delete(server, role) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM reactroles WHERE server_id = $1 AND role_id = $2`, [server, role]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			super.delete(`${server}-${role}`);
			res();
		})
	}

	async deleteAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var roles = await this.getAll(server);
				await this.db.query(`DELETE FROM reactroles WHERE server_id = $1 AND role_id = $2`, [server, role]);
				for(role of roles) super.delete(`${server}-${role.role_id}`);
			} catch(e) {
				console.log(e)
				return rej(e.message || e);
			}

			res();
		})
	}
}

module.exports = (bot, db) => new ReactRoleStore(bot, db);