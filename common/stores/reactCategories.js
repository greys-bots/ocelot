const {Collection} = require("discord.js");

class ReactCategoryStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO reactcategories (
					hid,
					server_id,
					name,
					description,
					roles,
					posts,
					single,
					required
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[hid, server, data.name, data.description,
				data.roles || [], data.posts || [], data.single, data.required]);
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
				await this.db.query(`INSERT INTO reactcategories (
					hid,
					server_id,
					name,
					description,
					roles,
					posts,
					single,
					required
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[hid, server, data.name, data.description,
				data.roles || [], data.posts || [], data.single, data.required]);
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
				var data = await this.db.query(`SELECT * FROM reactcategories WHERE server_id = $1 AND hid = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var category = data.rows[0];
				console.log(category);
				category.raw_posts = category.posts;
				category.posts = (await this.bot.stores.reactPosts.getByRowIDs(server, category.posts)) || [];
				category.raw_roles = category.roles.map(r => parseInt(r));
				category.roles = await this.bot.stores.reactRoles.getByRowIDs(server, category.roles);
				if(category.raw_posts.length > category.posts.length || category.raw_roles.length > category.roles.length) {
					category.raw_posts = category.posts.map(p => p.id);
					category.raw_roles = category.roles.map(r => r.id);
					await this.update(server, hid, {posts: category.raw_posts, roles: category.raw_roles});
				}
				category.roles = category.roles.sort((a, b) => {
					return category.raw_roles.indexOf(a.id) - category.raw_roles.indexOf(b.id)
				})
				this.set(`${server}-${hid}`, category);
				res(category)
			} else res(undefined);
		})
	}

	async getByRole(server, role) {
		return new Promise(async (res, rej) => {
			try {
				var categories = await this.getAll(server);
			} catch(e) {
				return rej(e);
			}

			categories = categories.filter(c => c.roles.find(r => r.role_id == role) || c.raw_roles.find(r => r == role));
			if(categories[0]) res(categories);
			else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM reactcategories WHERE server_id = $1`,[server]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					data.rows[i].raw_posts = data.rows[i].posts;
					data.rows[i].posts = await this.bot.stores.reactPosts.getByRowIDs(server, data.rows[i].posts);
					data.rows[i].raw_roles = data.rows[i].roles.map(r => parseInt(r));
					data.rows[i].roles = await this.bot.stores.reactRoles.getByRowIDs(server, data.rows[i].roles);
					data.rows[i].roles = data.rows[i].roles.sort((a, b) => {
						return data.rows[i].raw_roles.indexOf(a.id) - data.rows[i].raw_roles.indexOf(b.id)
					})
				}
				res(data.rows)
			} else res(undefined);
		})
	}

	async update(server, hid, data = {}, updatePosts = true) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE reactcategories SET ${Object.keys(data).map((k, i) => k+"=$"+(i+3)).join(",")} WHERE server_id = $1 AND hid = $2`,[server, hid, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			var category = await this.get(server, hid, true);
			if(!category) return rej('mrr! category not found.');

			var embeds = await this.bot.utils.genReactPosts(this.bot, category.roles, {
				title: category.name,
				description: category.description,
				footer: {
					text: `category id: ${category.hid}${category.single ? " | you can only have one role from this category at a time." : ""}`
				}
			});

			if(updatePosts) {
				for(var post of category.posts) {
					try {
						await this.bot.stores.reactPosts.update(server, post.message_id, {...embeds[post.page], single: category.single, required: category.required});
					} catch(e) {
						return rej(e);
					}
				}
			}
				
			res(category);
		})
	}

	async delete(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM reactcategories WHERE server_id = $1 AND hid = $2`, [server, hid]);
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
				var categories = await this.getAll(server);
				await this.db.query(`DELETE FROM reactcategories WHERE server_id = $1`, [server]);
			} catch(e) {
				console.log(e);
				return rej(e.message || e);
			}

			for(category of categories) super.delete(`${server}-${category.hid}`);
			res();
		})
	}
}

module.exports = (bot, db) => new ReactCategoryStore(bot, db);