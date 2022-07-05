module.exports = {
	help: ()=> "Blacklist bot usage to specific users/roles",
	usage: ()=> [
		" - Lists users/roles that have been blacklisted",
		" add [user/role] ... - Adds users/roles to the blacklist",
		" remove [user/role] ... - Removes users/roles from the blacklist",
		" clear - Clears the blacklist",
		" on - Turns on the blacklist. Turns off the whitelist if it's active",
		" off - Turns off the blacklist, but preserves the data there"
	],
	desc: ()=> "NOTE: Mods (aka those with permission to `MANAGE_MESSAGES`) will still be able to use the bot no matter what",
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(!config) return "mrr! no config for this server.";
		if(config.type == 1) return "mrr! the blacklist is disabled.";
		if(!config.blacklist) return "mrr! nothing's on the blacklist.";

		var roles = [];
		var users = [];
		for(var item of config.blacklist) {
			var role = msg.guild.roles.cache.find(r => r.id == item);
			var user = bot.users.cache.find(u => u.id == item);
			if(role) roles.push(role.toString());
			else if(user) users.push(user.toString());
		}

		return {embeds: [{
			title: "blacklist",
			description: "people who are denied usage of this bot",
			fields: [
				{name: "roles", value: roles[0] ? roles.join("\n") : "(none)"},
				{name: "users", value: users[0] ? users.join("\n") : "(none)"}
			]
		}]}
	},
	permissions: ["MANAGE_GUILD"],
	alias: ["bl"],
	guildOnly: true,
	subcommands: {}
}

module.exports.subcommands.add = {
	help: ()=> "Add users/roles to the blacklist",
	usage: ()=> [" [user/role] ... - Adds the given user(s)/role(s) to the blacklist"],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(config && [0, 1].includes(config.type)) return "mrr! you can't edit a disabled blacklist.";

		var blacklist = [];
		if(config && config.blacklist) blacklist = config.blacklist;
		var added = [];
		var invalid = [];

		for(var arg of args) {
			arg = arg.replace(/[<@!&>]/g, "");
			var role = msg.guild.roles.cache.find(r => r.id == arg || r.name.toLowerCase() == arg.toLowerCase());
			var user = bot.users.cache.find(u => u.id == arg);
			if((role || user) && !blacklist.includes(arg)) added.push(role || user);
			else invalid.push(arg);
		}

		blacklist = blacklist.concat(added.map(x => x.id));

		try {
			if(config) bot.stores.usages.update(msg.guild.id, {blacklist});
			else bot.stores.usages.create(msg.guild.id, {blacklist, type: 2});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return {embeds: [{
			title: "results",
			fields: [
				{name: "added", value: added[0] ? added.map(x => x.toString()).join("\n") : "(none)"},
				{name: "not added", value: invalid[0] ? invalid.join("\n") : "(none)"}
			]
		}]}
	},
	alias: ["a", "+"]
}

module.exports.subcommands.remove = {
	help: ()=> "Remove users/roles from the blacklist",
	usage: ()=> [" [user/role] ... - Removes the given user(s)/role(s) from the blacklist"],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(!config || !config.blacklist[0]) return "mrr! nothing to remove.";
		if(config && [0, 1].includes(config.type)) return "mrr! you can't edit a disabled blacklist.";
		
		var blacklist = config.blacklist;
		var removed = [];
		var invalid = [];

		for(var arg of args) {
			arg = arg.replace(/[<@!&>]/g, "");
			console.log(arg);
			var role = msg.guild.roles.cache.find(r => r.id == arg || r.name.toLowerCase() == arg.toLowerCase());
			var user = bot.users.cache.find(u => u.id == arg);
			if((role || user) && blacklist.includes(arg)) {
				blacklist = blacklist.filter(x => ![role?.id, user?.id].includes(x));
				removed.push(role || user);
			} else invalid.push(arg);
		}

		try {
			bot.stores.usages.update(msg.guild.id, {blacklist});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return {embeds: [{
			title: "results",
			fields: [
				{name: "removed", value: removed[0] ? removed.map(x => x.toString()).join("\n") : "(none)"},
				{name: "not removed", value: invalid[0] ? invalid.join("\n") : "(none)"}
			]
		}]}
	},
	alias: ["r", "rmv", "-"]
}

module.exports.subcommands.clear = {
	help: ()=> "Clear the blacklist",
	usage: ()=> [" - Clears everything from the blacklist"],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(!config || !config.blacklist[0]) return "mrr! nothing to clear.";
		if(config && [0, 1].includes(config.type)) return "mrr! you can't edit a disabled blacklist.";
		
		var message = await msg.channel.send("mrr! are you sure you want to clear this?");
		["✅","❌"].forEach(r => message.react(r));

		var confirm = await bot.utils.getConfirmation(bot, message, msg.author);
		if(confirm.msg) return confirm.msg;

		try {
			bot.stores.usages.update(msg.guild.id, {blacklist: []});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* blacklist cleared~";
	},
	alias: ["reset"]
}

module.exports.subcommands.on = {
	help: ()=> "Turn the blacklist on",
	usage: ()=> [" - Enables the blacklist"],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(config && config.type == 1) {
			var message = await msg.channel.send("mrr! whitelist already enabled. turn on the blacklist instead?");
			["✅","❌"].forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, message, msg.author);
			if(confirm.msg) return confirm.msg;
		}

		try {
			bot.stores.usages.update(msg.guild.id, {type: 2});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* blacklist enabled~";
	},
	alias: ['enable']
}

module.exports.subcommands.off = {
	help: ()=> "Turn the blacklist off",
	usage: ()=> [" - Disables the blacklist"],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.usages.get(msg.guild.id);
		if(config && [0, 1].includes(config.type)) return "mrr! blacklist already disabled.";

		try {
			bot.stores.usages.update(msg.guild.id, {type: 0});
		} catch(e) {
			return "mrr! error:\n"+e;
		}

		return "*prrr* blacklist disabled~";
	},
	alias: ['disable']
}