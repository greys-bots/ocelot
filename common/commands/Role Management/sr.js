const VALUES = {
	'y': true,
	'yes': true,
	'true': true,
	'1': true,

	'n': false,
	'no': false,
	'false': false,
	'0': false
}

module.exports = {
	help: ()=> "Manage self roles for the server",
	usage: ()=> [
		" - Lists available self roles",
		" [role] - Get info on a role",
		" modonly - Lists self roles that can only be assigned by mods",
		" index [role id] [true | false] - Indexes a role and sets whether it can be self-assigned or should be mod-assign only",
		" modonly [role id] [true | false] - Sets whether an existing role can be self-assigned or should be mod-assign only",
		" add [roles] <@user @mentions> - Adds self roles. Mention users to add roles to them",
		" remove [roles] <@user @mentions> - Removes self roles. Mention users to remove roles them",
		" description [role] [description] - Sets a self-role's description",
		" delete [role] - Deletes a self-role. Will not delete the role itself"
	],
	desc: "Put multi-word role names in quotes!",
	execute: async (bot, msg, args) => {
		var roles = await bot.stores.selfRoles.getAll(msg.guild.id);
		if(!roles || !roles.length) return "mrr! no self roles registered.";

		if(args[0] && args[0].toLowerCase() == "modonly") roles = roles.filter(x => !x.assignable);
		else if(args[0]) {
			var role = roles.find(r => [r.raw.name.toLowerCase(), r.role_id].includes(args[0].toLowerCase().replace(/[<@&>]/g, "")));
			if(!role) return "mrr! role not found.";

			return {embed: {
				title: role.raw.name,
				description: role.description || "*(no description)*",
				fields: [
					{name: "self assignable", value: role.assignable ? "yes" : "no"}
				],
				color: role.color || 0x202020
			}}
		}

		var embeds = await bot.utils.genEmbeds(bot, roles, async dat => {
			return {name: dat.raw.name, value: dat.description || "*(no description provided)*"}
		}, {
			title: "self roles",
			description: "all available self roles for the server",
		}, 10);

		return embeds;
	},
	group: true,
	subcommands: {},
	guildOnly: true
}

module.exports.subcommands.index = {
	help: ()=> "Index a self role",
	usage: ()=> [
		" [role] [true | false] <description>- Indexes a role, setting whether it can be self-assigned and optionally adding a description"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return "mrr! i need at least two arguments.";
		var name = args[0].toLowerCase().replace(/[<@&>]/g, "");
		var val = args[1].toLowerCase();
		var description = args.slice(2).join(" ");
		if(!Object.keys(VALUES).find(x => x == val)) return "mrr! last argument invalid. i need a truthy or falsy value."
		val = VALUES[val];
		
		var groles = await msg.guild.roles.fetch();
		try {
			var role = groles.cache.find(r => [r.name.toLowerCase(), r.id].includes(name));
			if(!role) role = await msg.guild.roles.fetch(name);
			if(!role) return "mrr! role not found.";
		} catch(e) {
			return "mrr! error:\n" + e.message;
		}

		await bot.stores.selfRoles.create(msg.guild.id, role.id, {assignable: val, description});

		return "*prrr* self role indexed~"
	},
	alias: ['i'],
	group: true
}

module.exports.subcommands.modonly = {
	help: ()=> "Set a self role's assignability",
	usage: ()=> [
		" [role] [true | false] - Sets whether the role can be self-assigned or not"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return "mrr! i need at least two arguments.";
		var name = args[0].toLowerCase().replace(/[<@&>]/g, "");
		var val = args[1].toLowerCase();
		if(!Object.keys(VALUES).find(x => x == val)) return "mrr! last argument invalid. i need a truthy or falsy value."
		val = VALUES[val];
		
		var groles = await msg.guild.roles.fetch();
		try {
			var role = groles.cache.find(r => [r.name.toLowerCase(), r.id].includes(name));
			if(!role) role = await msg.guild.roles.fetch(name);
			if(!role) return "mrr! role not found.";
		} catch(e) {
			return "mrr! error:\n" + e.message;
		}
		var sr = await bot.stores.selfRoles.get(msg.guild.id, role.id);
		if(!sr) return 'mrr! self role not indexed.';

		await bot.stores.selfRoles.update(msg.guild.id, role.id, {assignable: val});

		return "*prrr* self role updated~"
	},
	alias: ['mo', 'assignable'],
	group: true
}

module.exports.subcommands.add = {
	help: () => 'Add roles to yourself or others (latter is mod-only)',
	usage: [
		' [roles] - Adds available roles to yourself',
		' [roles] [@user @mention] - Adds roles to the given member(s)'
	],
	desc: () => "Note: Users MUST be mentioned!",
	execute: async (bot, msg, args) => {
		if(!args[0]) return "mrr! i need at least one argument.";
		var sr = await bot.stores.selfRoles.getAll(msg.guild.id);
		if(!sr || !sr[0]) return "mrr! no self roles available.";
		if(!msg.member.permissions.has('MANAGE_ROLES') && !sr.find(r => r.assignable))
			return 'mrr! all roles are mod-only.';
			
		var mentions = msg.mentions?.members?.map(m => m);
		var names = args.slice(0, mentions?.length || args.length);
		var targets = mentions?.length ? mentions : [msg.member];
		if(targets.length > 5) return 'mrr! too many targets. try 5 or less.';

		var groles = await msg.guild.roles.fetch();
		var roles = [];
		var invalid = [];
		for(var n of names) {
			var r = groles.cache.find(rl => [rl.name.toLowerCase(), rl.id].includes(n));
			if(!r) { invalid.push(`${n} - role not found`); continue; }

			var srl = sr.find(s => s.role_id == r.id);
			if(!srl) { invalid.push(`${r.name} - self role not indexed`); continue; }
			if(!msg.member.permissions.has('MANAGE_ROLES') && !srl.assignable)
				{ invalid.push(`${r.name} - role is mod-only`); continue; }

			roles.push(r.id);
		}

		var failed = [];
		if(roles[0]) for(var t of targets) {
			try { await t.roles.add(roles) }
			catch(e) { failed.push(`${t.user?.tag || t.tag} - ${e.message}`) }
		};

		var embeds = [
			{embed: {
				title: "Results - invalid roles",
				color: 0xaa5555
			}},
			{embed: {
				title: "Results - failed adds",
				color: 0xaa5555
			}}
		];
		if(invalid[0]) embeds[0].embed.description = invalid.join('\n');
		else embeds[0].embed.description = '(none)';

		if(failed[0]) embeds[1].embed.description = failed.join('\n');
		else embeds[1].embed.description = '(none)';

		return embeds;
	},
	alias: ['+'],
	group: true
}

module.exports.subcommands.remove = {
	help: () => 'Remove roles from yourself or others (latter is mod-only)',
	usage: [
		' [roles] - Removes available roles from yourself',
		' [roles] [@user @mention] - Removed roles from the given member(s)'
	],
	desc: () => "Note: Users MUST be mentioned!",
	execute: async (bot, msg, args) => {
		if(!args[0]) return "mrr! i need at least one argument.";
		var sr = await bot.stores.selfRoles.getAll(msg.guild.id);
		if(!sr || !sr[0]) return "mrr! no self roles available.";
		if(!msg.member.permissions.has('MANAGE_ROLES') && !sr.find(r => r.assignable))
			return 'mrr! all roles are mod-only.';
			
		var mentions = msg.mentions?.members?.map(m => m);
		var names = args.slice(0, mentions?.length || args.length);
		var targets = mentions?.length ? mentions : [msg.member];
		if(targets.length > 5) return 'mrr! too many targets. try 5 or less.';

		var groles = await msg.guild.roles.fetch();
		var roles = [];
		var invalid = [];
		for(var n of names) {
			var r = groles.cache.find(rl => [rl.name.toLowerCase(), rl.id].includes(n));
			if(!r) { invalid.push(`${n} - role not found`); continue; }

			var srl = sr.find(s => s.role_id == r.id);
			if(!srl) { invalid.push(`${r.name} - self role not indexed`); continue; }
			if(!msg.member.permissions.has('MANAGE_ROLES') && !srl.assignable)
				{ invalid.push(`${r.name} - role is mod-only`); continue; }

			roles.push(r.id);
		}

		var failed = [];
		if(roles[0]) for(var t of targets) {
			try { await t.roles.remove(roles) }
			catch(e) { failed.push(`${t.user?.tag || t.tag} - ${e.message}`) }
		};

		var embeds = [
			{embed: {
				title: "Results - invalid roles",
				color: 0xaa5555
			}},
			{embed: {
				title: "Results - failed removes",
				color: 0xaa5555
			}}
		];
		if(invalid[0]) embeds[0].embed.description = invalid.join('\n');
		else embeds[0].embed.description = '(none)';

		if(failed[0]) embeds[1].embed.description = failed.join('\n');
		else embeds[1].embed.description = '(none)';

		return embeds;
	},
	alias: ['rem', 'rmv', '-'],
	group: true
}

module.exports.subcommands.description = {
	help: () => "Set or clear a role's description",
	usage: () => [
		" [role] - Views and optionally clears a role's description",
		" [role] [description] - Sets the given role's description"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'mrr! i need at least one argument.';
		var name = args[0].toLowerCase();
		var description = args.slice(1).join(" ");
		console.log(description);

		var groles = await msg.guild.roles.fetch();
		var role = groles.cache.find(r => [r.name.toLowerCase(), r.id].includes(name));
		if(!role) return 'mrr! role not found';
		var sr = await bot.stores.selfRoles.get(msg.guild.id, role.id);
		if(!sr) return 'mrr! self role not indexed.';
		
		if(!description) {
			var message = await msg.channel.send(
				"*mrrr* current description:\n" +
				"```" +
				sr.description || "(not set)" +
				"```\n" +
				"would you like to clear it?"
			)
			['✅', '❌'].forEach(r => message.react(r));

			var conf = await bot.utils.getConfirmation(bot, message, author);
			if(conf.msg) return conf.msg;

			await bot.stores.selfRoles.update(msg.guild.id, role.id, {description: ""});
			return "*prrr* description cleared."
		}

		await bot.stores.selfRoles.update(msg.guild.id, role.id, { description });
		return "*prrr* description updated."
	},
	alias: ['desc', 'describe'],
	group: true,
	permissions: ['MANAGE_ROLES']
}

module.exports.subcommands.delete = {
	help: () => "Delete an indexed self role. Does not delete the role itself",
	usage: () => [
		" [role] - Deletes the given self role",
		" *|all - Deletes all self roles"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "mrr! i need at least one argument.";

		if(['*', 'all'].includes(args[0].toLowerCase())) {
			var sr = await bot.stores.selfRoles.getAll();
			if(!sr || !sr.length) return 'mrr! nothing to delete.';

			var message = await msg.channel.send('are you sure you want to delete **ALL** indexed self roles?');
			['✅', '❌'].forEach(r => message.react(r));
			var conf = await bot.utils.getConfirmation(bot, message, msg.author);

			if(conf.msg) return conf.msg;

			bot.stores.selfRoles.deleteAll(msg.guild.id);
			return '*prrr* self roles deleted~';
		}

		var name = (args.length > 1 ? args.join(" ") : args[0]).toLowerCase();
		var groles = await msg.guild.roles.fetch();
		var role = groles.cache.find(r => [r.name.toLowerCase(), r.id].includes(name));
		if(!role) return 'mrr! role not found.';
		var sr = await bot.stores.selfRoles.get(msg.guild.id, role.id);
		if(!sr) return 'mrr! self role not indexed.';

		await bot.stores.selfRoles.delete(msg.guild.id, role.id);
		return '*prrr* self role deleted~';
	},
	alias: ['del'],
	group: true,
	permissions: ['MANAGE_ROLES']
}