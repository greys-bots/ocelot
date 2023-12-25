const { Models: { DataStore, DataObject } } = require('frame');
const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	category: { },
	roles: { patch: true },
	page: { },
	single: { patch: true },
	required: { patch: true}
}

class ReactPost extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}

	async fetchMessage() {
		var bot = this.store.bot;

		try {
			var guild = await bot.guilds.fetch(this.server_id);
			var channel = await guild.channels.fetch(this.channel_id);
			var message = await channel.messages.fetch(this.message_id);
		} catch(e) {
			return Promise.reject(e);
		}

		this.message = message;
		return message;
	}

	async fetchCategory() {
		if(!this.category) return;
		var category = await this.store.bot.stores.reactCategories.get(this.server_id, this.category);
		
		this.reactCategory = category;
		return category;
	}

	async fetchReactRoles() {
		var roles = await this.store.bot.stores.reactRoles.getByRowIDs(this.server_id, this.roles)

		this.reactRoles = roles;
		return roles;
	}

	async fetchGuildRoles() {
		if(!this.reactRoles) await this.fetchReactRoles();

		try {
			var guild = await bot.guilds.fetch(this.server_id);
			var roles = [];
			for(var r of this.reactRoles) {
				try {
					var rl = await guild.roles.fetch(r.role_id);
				} catch(e) {
					continue;
				}

				roles.push(rl);
			}
		} catch(e) {
			return Promise.reject(e);
		}

		this.guildRoles = roles;
		return roles;
	}
}

class ReactPostStore extends DataStore {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async init() {
		this.bot.on("messageReactionAdd", (...args) => {
			try {
				this.handleReactions(...args)
			} catch(e) {
				console.log(e);
			}
		})

		this.bot.on("messageDelete", async (msg) => {
			if(msg.channel.type == 'dm') return;

			try {
				var post = await this.get(msg.channel.guild.id, msg.id);
				if(!post) return;
				await this.delete(post.server_id, post.message_id);
			} catch(e) {
				console.log(e);
				return Promise.reject(e.message || e);
			}	
		})
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO reactposts (
				server_id,
				channel_id,
				message_id,
				category,
				roles,
				page,
				single,
				required
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id,
			 data.category, data.roles || [], data.page || 0,
			 data.single, data.required]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO reactposts (
					server_id,
					channel_id,
					message_id,
					category,
					roles,
					page,
					single,
					required
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[server, channel, message, data.category, data.roles || [], data.page || 0, data.single, data.required]);
			} catch(e) {
				console.log(e);
		 		return Promise.reject(e.message);
			}
			
			res();
		})
	}

	async get(server, message) {
		try {
			var data = await this.db.query(`SELECT * FROM reactposts WHERE server_id = $1 AND message_id = $2`,[server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) new ReactPost(this, KEYS, data.rows[0]);
		else return new ReactPost(this, KEYS, { server_id: server });
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM reactposts WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) new ReactPost(this, KEYS, data.rows[0]);
		else return new ReactPost(this, KEYS, { });
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM reactposts WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) return data.rows.map(d => new ReactPost(this, KEYS, d));
		else return undefined;
	}

	async getByRole(server, id) {
		try {
			var data = await this.db.query(`SELECT * FROM reactposts WHERE server_id = $1 AND $2 = ANY(reactposts.roles)`,[server, id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) return data.rows.map(d => new ReactPost(this, KEYS, d));
		else return undefined;
	}

	async getIDs(server, ids) {
		try {
			var data = await this.db.query(`SELECT * FROM reactposts WHERE id = ANY($1)`,[ids]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows && data.rows[0]) return data.rows.map(d => new ReactPost(this, KEYS, d));
		else return undefined;
	}

	async update(id, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE reactposts SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return Promise.reject(e.message);
			}
			
			var post = await this.getID(id);
			var message = await post.fetchMessage();
			var rrs = await post.fetchReactRoles();
			var rls = await post.fetchRoles();
			var rrs = rrs.map(r => {
				var rl = rls.find(x => x.id == r.role_id);
				return {
					...r,
					name: rl.name
				}
			})

			if(!message) {
				await this.delete(id);
				return;
			}

			if(message.embeds[0] && message.author.id == this.bot.user.id) { //react post from us
				if(!data.embed && data.roles) { //regen roles
					data = await this.bot.utils.genReactPosts(this.bot, post.reactRoles, {
						title: message.embeds[0].title,
						description: message.embeds[0].description,
						footer: message.embeds[0].footer
					})
					data = data[0];
				} else if(!data.embed && post.page > 0) {
					try {
						await this.delete(server, message);
						await message.delete();
					} catch(e) {
						return Promise.reject(e.message || e);
					}
				} else {
					try {
						await message.edit({embeds: [data.embed]});
						await message.reactions.removeAll()
						for(emoji of data.emoji) await message.react(emoji);
					} catch(e) {
						console.log(e);
						return Promise.reject(e.message);
					}
				}
			} else { //probably not a react post, or not from us; bound post instead
				var channel = await this.bot.channels.fetch(post.channel_id);
				var msg = await channel.messages.fetch(message_id);

				if(!data.emoji) data.emoji = post.roles.map(r => r.emoji);
				await msg.reactions.removeAll();
				for(var emoji of data.emoji) await msg.react(emoji);
			}
			
			return post;
		})
	}

	//for react roles bound outside of categories
	async updateBound(server, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				if(data.roles) await this.db.query(`UPDATE reactposts SET roles = $1 WHERE server_id = $2, message_id = $3`,[data.roles, server, message]);
			} catch(e) {
				console.log(e);
				return Promise.reject(e.message);
			}
			
			var post = await this.get(server, message, true);
			if(!post.roles || !post.roles[0]) await this.delete(server, message);
			
			res(post);
		})
	}
	
	async delete(server, message) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM reactposts WHERE server_id = $1 AND message_id = $2`, [server, message]);
			} catch(e) {
				console.log(e);
				return Promise.reject(e.message || e);
			}

			res();
		})
	}

	async handleReactions(react, user) {
		return new Promise(async (res, rej) => {
			if(this.bot.user.id == user.id) return;
			if(react.partial) react = await react.fetch();
			var msg = await react.message.fetch();

			var post = await this.get(msg.channel.guild.id, msg.id);
			if(!post) return;

			var name;
			if(react.emoji.id) name = `:${react.emoji.name}:${react.emoji.id}`;
			else name = react.emoji.name;
			var role = post.roles.find(r => [name, `a${name}`].includes(r.emoji));
			if(!role) return;
			
			role = await msg.channel.guild.roles.fetch(role.role_id);
			if(!role) return;
			var member = await msg.channel.guild.members.fetch(user.id);
			if(!member) return;

			if(post.category) var category = await this.bot.stores.reactCategories.get(msg.channel.guild.id, post.category);

			try {
				react.users.remove(user.id);
				if(post.required && !member.roles.cache.has(post.required)) return;
				if(category?.single) {
					await member.roles.remove(category.roles.map(r => r.role_id).filter(x => x != role.id));
				}
				if(member.roles.cache.has(role.id)) await member.roles.remove(role.id);
				else await member.roles.add(role.id);
			} catch(e) {
				console.log(e);
				return await user.send(`mrr! error:\n${e.message}\nlet a mod know something went wrong.`);
			}

			res();
		})
	}
}

module.exports = (bot, db) => new ReactPostStore(bot, db);
