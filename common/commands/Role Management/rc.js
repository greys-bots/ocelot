module.exports = {
	help: ()=> "Manages reaction categories for the server",
	usage: ()=> [
		" - Lists available categories and their IDs",
		" create [name] [description] - Creates new react role category",
		" delete [ID] - Deletes category (does not delete associated reaction roles)",
		" add [ID] [role] - Adds react role to the category",
		" remove [ID] [role] - Removes react role from the category",
		" name [ID] [new name] - Changes category name",
		" description [ID] [new description] - Changes category description",
		" post [category] [channel] - Posts category's roles in a channel",
		" info [ID] - Gets info on a category (eg: roles registered to it)"
	],
	execute: async (bot, msg, args)=> {
		var embeds = [];
		if(args[0]) {
			var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
			if(!category) return "mrr! category not found.";
			if(!category.roles?.[0]) return "mrr! that category is empty.";
			if(category.required) var req = msg.guild.roles.cache.find(r => r.id == category.required);

			embeds = await bot.utils.genEmbeds(bot, category.roles, rl => {
				return {name: `${rl.raw.name} (${rl.emoji.includes(":") ? `<${rl.emoji}>` : rl.emoji})`, value: `description: ${rl.description || "*(no description provided)*"}\npreview: ${rl.raw}`}
			}, {
				title: `${category.name}`,
				description: category.description + `\nrequired role: ${req ? `${req}` : "(none)"}`,
				footer: {text: `id: ${category.hid} | this category's roles ${category.single ? "are" : "are not"} unique.`}
			}, 10);
		} else {
			var categories = await bot.stores.reactCategories.getAll(msg.guild.id);
			if(!categories?.[0]) return 'mrr! no categories found.';

			var err = false;
			for(category of categories) {
				var tmp;
				if(category.required) var req = msg.guild.roles.cache.find(r => r.id == category.required);
				if(category.roles && category.roles[0]) {
					tmp = await bot.utils.genEmbeds(bot, category.roles, rl => {
						return {name: `${rl.raw.name} (${rl.emoji.includes(":") ? `<${rl.emoji}>` : rl.emoji})`, value: `description: ${rl.description || "*(no description provided)*"}\npreview: ${rl.raw}`}
					}, {
						title: `${category.name}`,
				description: category.description + `\nrequired role: ${req ? req.mention : "(none)"}`,
				footer: {text: `ID: ${category.hid} | this category's roles ${category.single ? "are" : "are not"} unique.`}
					}, 10, {addition: ""});
				} else {
					tmp = {embed: {
						title: `${category.name} (${category.hid})`,
						description: category.description,
						fields: [
							{name: "no roles!", value: "this category is empty."}
						]
					}}
				}
				embeds = embeds.concat(tmp);
			}

			embeds.forEach((e, i) => e.embed.title = `${e.embed.title} (page ${i+1}/${embeds.length}, ${categories.length} categories total)`);
		}

		return embeds;
	},
	alias: ['reactcategories'],
	permissions: ["MANAGE_ROLES"],
	subcommands: {},
	guildOnly: true
}

module.exports.subcommands.create = {
	help: ()=> "Creates a new reaction role category",
	usage: ()=> [" [name] (new line) [description] - Creates a new category with the given name and description (NOTE: description needs to be on new line)"],
	execute: async (bot, msg, args)=> {
		var nargs = args.join(" ").split("\n");
		var code = bot.utils.genCode(bot.chars);

		try {
			await bot.stores.reactCategories.create(msg.guild.id, code, {name: nargs[0], description: nargs.slice(1).join("\n")});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* category created~\nid: "+code;
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.delete = {
	help: ()=> "Deletes a category",
	usage: ()=> [" [id] - Deletes a reaction category"],
	execute: async (bot, msg, args) => {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0]);
		if(!category) return 'mrr! category not found.';

		try {
			await bot.stores.reactCategories.delete(msg.guild.id, args[0]);
		} catch(e) {
			return 'mrr! error:\n'+e;
		}

		return "*prrr* category deleted~";
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.name = {
	help: ()=> "Changes name for a category",
	usage: ()=> [" [ID] [name] - Changes name for the given category"],
	execute: async (bot, msg, args)=> {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return 'mrr! category not found.';

		try {
			await bot.stores.reactCategories.update(msg.guild.id, category.hid, {name: args.slice(1).join(" ")});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* category updated~";
	},
	alias: ["describe", "desc"],
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.description = {
	help: ()=> "Changes description for a category",
	usage: ()=> [" [ID] [description] - Changes description for the given category"],
	execute: async (bot, msg, args)=> {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return 'mrr! category not found.';

		try {
			await bot.stores.reactCategories.update(msg.guild.id, category.hid, {description: args.slice(1).join(" ")});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* category updated~";
	},
	alias: ["describe", "desc"],
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.add = {
	help: ()=> "Adds roles to a category",
	usage: ()=> [" [ID] [comma, separated, role names] - Adds role to a category"],
	execute: async (bot, msg, args)=> {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return 'mrr! category not found.';

		var result = [];
		var roles = args.slice(1).join(" ").split(/,\s+/g);
		var max = category.posts && category.posts[0] ? category.posts.sort((a,b)=> a.page - b.page)[0].page : 0;
		for(var rl of roles) {
			var role = msg.guild.roles.cache.find(r => r.id == rl.replace(/[<@&>]/g, "") || r.name.toLowerCase() == rl.toLowerCase());
			if(!role) {
				result.push({succ: false, name: rl, reason: "role not found"})
				continue;
			}
			var rr = await bot.stores.reactRoles.get(msg.guild.id, role.id);
			if(!rr) {
				result.push({succ: false, name: rl, reason: "react role not found"});
			} else {
				if(category.roles.find(r => r.id == rr.id)) {
					result.push({succ: false, name: role.name, reason: "react role already in category"});
				} else if(category.roles.find(r => r.emoji == rr.emoji)) {
					result.push({succ: false, name: role.name, reason: "react role with that emoji already in category"});
				} else {
					result.push({succ: true, name: role.name});
					category.raw_roles.push(rr.id);
				}
			}
		}

		try {
			await bot.stores.reactCategories.update(msg.guild.id, category.hid, {roles: category.raw_roles});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return {
			content: Math.ceil(category.roles.length/10)-1 > max ?
				"mrr! i updated the category, but there are too many roles to fit them " +
				"all in the current pages. if you want to see all of them, delete " +
				"the current pages and repost the category." :
				"",
			embed: {
				title: "results",
				fields: [
					{name: "added", value: result.filter(r => r.succ).map(r => r.name).join("\n") || "none"},
					{name: "not added", value: result.filter(r => !r.succ).map(r => `${r.name} - ${r.reason}`).join("\n") || "none"},	
				]
			}
		};
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.remove = {
	help: ()=> "Remove roles from a category",
	usage: ()=> [" [ID] [comma, separated, role names] - Removes roles from category"],
	execute: async (bot, msg, args)=> {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return 'mrr! category not found.';

		var result = [];
		var roles = args.slice(1).join(" ").split(/,\s+/g);
		var max = category.posts ? category.posts.sort((a,b)=> a.page - b.page) : 0;
		for(var rl of roles) {
			var role = msg.roleMentions.length > 0 ?
				   msg.roleMentions[0] :
				   msg.guild.roles.cache.find(r => r.id == rl.replace(/[<@&>]/g, "") || r.name.toLowerCase() == rl.toLowerCase());
			if(!role) {
				result.push({succ: false, name: rl, reason: "role not found"})
			}

			var rr = await bot.stores.reactRoles.get(msg.guild.id, role.id);
			if(!rr) {
				result.push({succ: false, name: role.name, reason: "react role not found"});
			} else {
				category.raw_roles = category.raw_roles.filter(x => x != rr.id);
				result.push({succ: true, name: role.name});
			}
		}

		try {
			await bot.stores.reactCategories.update(msg.guild.id, category.hid, {roles: category.raw_roles});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return {
			content: Math.ceil(category.roles.length/10)-1 > max ?
				"mrr! i updated the category, but there are too many roles to fit them " +
				"all in the current pages. if you want to see all of them, delete " +
				"the current pages and repost the category." :
				"",
			embed: {
				title: "results",
				fields: [
					{name: "removed", value: result.filter(r => r.succ).map(r => r.name).join("\n") || "none"},
					{name: "not removed", value: result.filter(r => !r.succ).map(r => `${r.name} - ${r.reason}`).join("\n") || "none"},	
				]
			}
		};
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.post = {
	help: ()=> "Posts a message with all possible reaction roles",
	usage: ()=> [" [category] [channel] - Posts reaction roles message in given channel"],
	execute: async (bot, msg, args) => {
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return 'mrr! category not found.';

		var channel = msg.guild.channels.cache.find(ch => [ch.id, ch.name].includes(args[1].toLowerCase().replace(/[<#>]/g, "")));
		if(!channel) return 'mrr! channel not found.';

		var posts = await bot.utils.genReactPosts(bot, category.roles, {
			title: category.name,
			description: category.description,
			footer: {
				text: `category id: ${category.hid}${category.single ? " | you can only have one role from this category at a time." : ""}`
			}
		});

		for(var i = 0; i < posts.length; i++) {
			var message = await channel.send({embed: posts[i].embed});
			posts[i].emoji.forEach(r => message.react(r));
			var post = await bot.stores.reactPosts.create(msg.guild.id, channel.id, message.id, {...posts[i], page: i, category: category.hid, single: category.single, required: category.required});
			category.raw_posts.push(post.id);
		}

		await bot.stores.reactCategories.update(msg.guild.id, category.hid, {posts: category.raw_posts}, false);
	},
	permissions: ["MANAGE_ROLES"],
	guildOnly: true
}

module.exports.subcommands.unique = {
	help: ()=> "Sets whether a category's roles are unique or not",
	usage: ()=> [" [id] - Tells you the current value for the given category",
				 " [id] (1 | true) - Sets the category's roles to be unique",
				 " [id] (0 | false) - Sets the category's roles to not be unique"],
	desc: ()=> ["`Unique` means that users can only receive one role from this category at a time. ",
				"If they try to receive multiple, it'll automatically remove extra ones"],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "Please provide at least a category ID";
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return "Category not found";

		if(!args[1]) return `Current value: ${category.single}`;

		try {
			switch(args[1].toLowerCase()) {
				case "1":
				case "true":
					await bot.stores.reactCategories.update(msg.guild.id, category.hid, {single: true});
					break;
				case "0":
				case "false":
					await bot.stores.reactCategories.update(msg.guild.id, category.hid, {single: false});
					break;
			}
		} catch(e) {
			return "ERR: "+e;
		}

		return "Uniqueness set!";
	},
	alias: ['u', 'single'],
	permissions: ['MANAGE_ROLES'],
	guildOnly: true
}

module.exports.subcommands.required = {
	help: ()=> "Sets the required role for a category",
	usage: ()=> [" [id] - Tells you the current value for the given category",
				 " [id] [role] - Sets the category's required role",
				 " [id] clear - Clears the category's required role"],
	desc: ()=> ["A `required role` is a base role required for users to get roles from the category. ",
				"An example would be requiring users to have a `Verified` role before giving them more"],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "mrr! i need at least a category id.";
		var category = await bot.stores.reactCategories.get(msg.guild.id, args[0].toLowerCase());
		if(!category) return "mrr! category not found.";

		if(!args[1]) {
			if(!category.required) return "mrr! that category doesn't have a required role.";
			var role = msg.guild.roles.cache.find(r => r.id == category.required);
			if(!role) return "mrr! the required role for that category is invalid or deleted.";
			var message = await msg.channel.send({embed: {
				title: "current role",
				description: role.mention,
				footer: {text: `to clear it, react with :x: or type "clear"`}
			}});
			await message.react('❌');

			var confirmation = await bot.utils.handlechoices(bot, message, msg.author, [
				{
					accepted: ['❌', 'clear'],
					name: 'clear'
				}
			]);

			if(confirmation.msg) return;

			message = await msg.channel.send("mrr! are you sure you want to clear the required role?");
			['✅','❌'].forEach(r => message.react(r));

			confirmation = await bot.utils.getConfirmation(bot, message, msg.author);
			if(confirmation.msg) return confirmation.msg;

			try {
				await bot.stores.reactCategories.update(msg.guild.id, category.hid, {required: null});
			} catch(e) {
				return "mrr! error:\n"+e;
			}

			return "*prrr* required role cleared~";
		}

		var role = msg.guild.roles.cache.find(r => [r.id, r.name].includes(args[1].replace(/[<@&>]/g, "").toLowerCase()));
		if(!role) return "mrr! role not found.";
		try {
			await bot.stores.reactCategories.update(msg.guild.id, category.hid, {required: role.id});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* required role set~";
	},
	alias: ['req', 'role'],
	permissions: ['MANAGE_ROLES'],
	guildOnly: true
}