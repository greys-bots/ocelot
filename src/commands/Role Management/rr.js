module.exports = {
	help: ()=> "Manages reaction roles for the server",
	usage: ()=> [
		" - Views available reaction role configs",
		" add [role] [emoji] (new line) <description> - Creates a new reaction role config, description optional (NOTE: to allow multi-word role names, all other arguments must be separated by a new line)",
		" delete [role] - Removes an existing reaction role config",
		" emoji [role] [newemoji] - Changes the emoji for an existing reaction role",
		" description [role] (new line) [new description] - Changes the description for an existing reaction role (NOTE: description must be on a new line)"
	],
	execute: async (bot, msg, args) => {
		var roles = await bot.stores.reactRoles.getAll(msg.guild.id);
		if(!roles || !roles.length) return 'mrr! no reaction roles registered.';

		var embeds = await bot.utils.genEmbeds(bot, roles, async dat => {
			return {name: `${dat.raw.name} (${dat.emoji.includes(":") ? `<${dat.emoji}>` : dat.emoji})`, value: dat.description || "*(no description provided)*"}
		}, {
			title: "react roles",
			description: "all available roles for the server",
		}, 10);
		
		return embeds;
	},
	alias: ['reactroles', 'reactrole', 'reactionrole'],
	subcommands: {},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.add = {
	help: ()=> "Adds a new reaction role",
	usage: ()=> [" [role] [emoji] (new line) <description> - Creates a new reaction role config (NOTE: if emoji is custom, must be in the same server as the bot)"],
	execute: async (bot, msg, args)=> {
		var nargs = args.join(" ").split("\n");
		var arg1 = nargs[0].replace(/\s+$/,"").split(" ");
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(arg1.slice(0, arg1.length-1).join(" ").replace(/[<@&>]/g, "").toLowerCase()));
		if(!role) return "mrr! role not found.";
		var emoji = arg1.slice(-1)[0].replace(/[<>\s]/g,"");
		var description = nargs.slice(1).join("\n");

		try {
			await bot.stores.reactRoles.create(msg.guild.id, role.id, {emoji, description});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* react role created~";
	},
	alias: ['create', 'new'],
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.remove = {
	help: ()=> "Removes a reaction role config",
	usage: ()=> [" [role] - Removes config for the role (NOTE: roles that are deleted automatically have their config removed when posting or listing configs"],
	execute: async (bot, msg, args)=> {
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(args.join(" ").replace(/[<@&>]/g, "").toLowerCase()));
		if(!role) return "mrr! role not found.";
		
		try {
			var rr = await bot.stores.reactRoles.get(msg.guild.id, role.id);
			if(!rr) return "mrr! that isn't a react role.";
			await bot.stores.reactRoles.delete(msg.guild.id, role.id);
			var categories = await bot.stores.reactCategories.getByRole(msg.guild.id, rr.id);
			if(categories?.[0]) {
				for(var c of categories) await bot.stores.reactCategories.get(c.server_id, c.hid);
			}
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* react role deleted~";
	},
	alias: ['delete'],
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.bind = {
	help: ()=> "Binds a reaction role to a certain message.",
	usage: ()=> [" [role name] [channel] [messageID] - Binds a role to the message"],
	execute: async (bot, msg, args) => {
		if(!args[2]) return "mrr! i need three arguments for this.";
		var rl = args.slice(0, args.length - 2).join(" ").replace(/[<@&>]/g,"").toLowerCase();
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(rl));
		if(!role) return "mrr! role not found.";
		role = await bot.stores.reactRoles.get(msg.guild.id, role.id);
		if(!role) return "mrr! react role not found.";

		var channel = msg.guild.channels.cache.find(ch => [ch.id, ch.name].includes(args[args.length - 2].replace(/[<#>]/g,"").toLowerCase()));
		if(!channel) return "mrr! channel not found.";
		channel = await channel.fetch();
		var message = await channel.messages.fetch(args[args.length-1]);
		if(!message) return "mrr! invalid message.";

		var post = await bot.stores.reactPosts.get(message.guild.id, message.id);
		try {
			if(post) {
				if(post.roles.find(r => r.role_id == role.role_id)) {
					return "mrr! that role is already bound to that message.";
				} else if(post.roles.find(r => r.emoji == role.emoji)) {
					return "mrr! role with that emoji is already bound to that message.";
				} else {
					post.raw_roles.push(role.id);
					await bot.stores.reactPosts.update(msg.guild.id, post.message_id, {roles: post.raw_roles});
				}
			} else {
				await bot.stores.reactPosts.create(msg.guild.id, message.channel.id, message.id, {roles: [role.id], page: 0});
			}

			await message.react(role.emoji.replace(/^\:/, ""));
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* react role bound~";
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.unbind = {
	help: ()=> "Uninds a reaction role from a certain message",
	usage: ()=> [" [role name] [channel] [messageID] - Unbinds a role from the message"],
	execute: async (bot, msg, args) => {
		if(!args[2]) return "mrr! i need three arguments for this.";
		var rl = args.slice(0, args.length - 2).join(" ").replace(/[<@&>]/g,"").toLowerCase();
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(rl));
		if(!role) return "mrr! role not found.";
		role = await bot.stores.reactRoles.get(msg.guild.id, role.id);
		if(!role) return "mrr! react role not found.";

		var channel = msg.guild.channels.cache.find(ch => [ch.id, ch.name].includes(args[args.length - 2].replace(/[<#>]/g,"").toLowerCase()));
		if(!channel) return "mrr! channel not found.";
		channel = await channel.fetch();
		var message = await channel.messages.fetch(args[args.length-1]);
		if(!message) return "mrr! invalid message.";

		var post = await bot.stores.reactPosts.get(message.guild.id, message.id);
		try {
			if(post) {
				if(post.roles.find(r => r.role_id == role.role_id)) {
					post.raw_roles = post.raw_roles.filter(x => x != role.id);
					await bot.stores.reactPosts.update(msg.guild.id, post.message_id, {roles: post.raw_roles});
					
				} else {
					return "mrr! that role isn't bound to that message.";
				}
			} else {
				return "mrr! nothing bound to that message.";
			}

			var emoji = role.emoji.includes(":") ? role.emoji.match(/:(\d+)/)[1] : role.emoji;
			await message.reactions.cache.find(r => [r.emoji.id, r.emoji.name].includes(emoji))?.remove();
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* react role unbound~";
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.emoji = {
	help: ()=> "Changes emoji for a role",
	usage: ()=> [" [role] [emoji] - Changes emoji for the given role"],
	execute: async (bot, msg, args)=> {
		var rl = args.slice(0, args.length - 1).join(" ").replace(/[<@&>]/g,"").toLowerCase();
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(rl));
		if(!role) return "mrr! role not found.";
		role = await bot.stores.reactRoles.get(msg.guild.id, role.id);
		if(!role) return "mrr! react role not found.";

		var emoji = args[args.length - 1].replace(/[<>]/g,"");

		try {
			await bot.stores.reactRoles.update(msg.guild.id, role.role_id, {emoji});
		} catch(e) {
			return "ERR: "+e
		}

		return "*prrr* emoji changed~";
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.description = {
	help: ()=> "Changes description for a role",
	usage: ()=> [" [role] (new line) [description] - Changes description for the given role"],
	execute: async (bot, msg, args)=> {
		var nargs = args.join(" ").split("\n");
		var rl = nargs[0].replace(/[<@&>]/g,"").toLowerCase();
		var role = msg.guild.roles.cache.find(r => [r.id, r.name.toLowerCase()].includes(rl));
		if(!role) return "mrr! role not found.";
		role = await bot.stores.reactRoles.get(msg.guild.id, role.id);
		if(!role) return "mrr! react role not found.";

		var description = nargs.slice(1).join("\n");

		try {
			await bot.stores.reactRoles.update(msg.guild.id, role.role_id, {description});
		} catch(e) {
			return "mrr! error:\n"+e
		}

		return "*prrr* description changed~";
	},
	alias: ["describe", "desc"],
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}