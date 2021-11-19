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
	help: ()=> "Manages self role bundles for the server",
	usage: ()=> [
		" [bundle id] - Gets info on a bundle",
		" create <name> <roles> - Runs a menu to create a new bundle. Provide the arguments for a quick method",
		" add [bundle id] <@user @mentions> - Adds the given bundle's roles. Mention users to affect them instead",
		" remove [bundle id] <@user @mentions> - Removes the given bundle's roles. Mention users to affect them instead",
		" name [bundle id] [new name] - Changes a bundle's name",
		" description [bundle id] [new description] - Changes a bundle's description",
		" modonly [bundle id] [true|false] - Change a bundle's self-assignability",
		" password [bundle id] <password> - Set a password for a bundle",
		" delete [bundle id] - Deletes a bundle. Will not delete the actual roles inside, nor the self roles associated"
	],
	desc: ()=> "Note: Unlike react categories, bundles don't require you to set up self roles first, "+
			   "and will allow users to add whatever roles are in a bundle as long as the bundle itself "+
			   "is self-assignable",
	execute: async (bot, msg, args) => {
		var bundles = await bot.stores.bundles.getAll(msg.guild.id);
		if(!bundles?.length) return 'mrr! no bundles to look at.';
		if(args[0]) bundles = bundles.filter(b => b.hid == args[0].toLowerCase());
		if(!bundles?.length) return "mrr! bundle not found.";

		var embeds = [];
		for(var b of bundles) {
			var e = {embed: {
				title: b.name,
				description: b.description || "(no description)",
				fields: b.roles.map(r => { return {name: r.name, value: `Preview: ${r.toString()}` } }),
				footer: {text: `ID: ${b.hid}`}
			}}
			if(b.modonly) e.embed.footer += ` | this bundle is mod-only.`;
			embeds.push(e)
		}

		if(embeds.length > 1) for(var i = 0; i < embeds.length; i++) embeds[i].embed.title += ` (${i + 1}/${embeds.length})`;
		return embeds;
	},
	group: true,
	guildOnly: true,
	subcommands: {}
}

subcommands = module.exports.subcommands;

subcommands.create = {
	help: ()=> "Create a new bundle of roles",
	usage: ()=> [
		' - Runs a menu to create a new bundle of roles',
		' [name] [roles] - Quicker option for creating a bundle'
	],
	desc: ()=> "If not using the menu method, but all multi-word names in quotes!" +
			   "Roles can be role names, IDs, or mentions\n" +
			   "**Limits:**\n- Names must be 100 characters or less\n- Bundles can have a max of 20 roles in them",
	execute: async (bot, msg, args) => {
		var name = args[0];
		var roles = args.slice(1)?.map(r => r.toLowerCase().replace(/[<@&>]/g, ''));

		var resp;
		if(!name) {
			await msg.channel.send('enter a name for this bundle.');
			resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60000});
			if(!resp.size) return 'mrr! timed out.';
			name = resp.first().content;
		}
		if(name.length > 100) return ''

		if(!roles?.length) {
			await msg.channel.send('enter the roles you want to put in the bundle. put one on each line.');
			resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 3 * 60000});
			if(!resp.size) return 'mrr! timed out.';
			roles = resp.first().content.split('\n').map(r => r.toLowerCase().replace(/[<@&>]/g, ''));
		}

		var assignable;
		var message = await msg.channel.send("do you want this bundle to be self-assignable?");
		['✅', '❌'].forEach(r => message.react(r));
		var conf = await bot.utils.handleChoices(bot, message, msg.author, [
			{
				accepted: ['y', 'yes', '1', '✅'],
				name: 'yes'
			},
			{
				accepted: ['n', 'no', '0', '❌'],
				name: 'no'
			}
		]);

		if(conf.name == 'invalid') return conf.msg;
		if(conf.name == 'yes') assignable = true;
		else assignable = false;

		var valid = [];
		for(var r of roles) {
			var role = msg.guild.roles.cache.find(rl => [rl.name.toLowerCase(), rl.id].includes(r));
			if(!role) continue;
			valid.push(role.id);
		}

		try {
			var bundle = await bot.stores.bundles.create(msg.guild.id, {name, roles: valid, assignable});
		} catch(e) { return 'mrr! error:\n'+e.message }

		var m = '*prrr* bundle created~\nid: '+bundle.hid;
		if(valid.length !== roles.length) m += "\n\n(some roles weren't found and didn't make it into this bundle.)";

		return m;
	},
	group: true,
	guildOnly: true,
	alias: ['c', 'new', 'n']
}

subcommands.add = {
	help: ()=> "Add all of a bundle's roles to yourself or others (latter is mod-only)",
	usage: ()=> [
		" [bundle id] - Adds the given bundle's roles to yourself",
		" [bundle id] [@user @mentions] - Adds the given bundle to the pinged users"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'mrr! i need at least one argument.';

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';
		
		var mod = msg.member.permissions.has('MANAGE_ROLES');
		if(!bundle.assignable && !mod) return 'mrr! that bundle is mod-only.';
		if(msg.mentions?.members?.first() && !mod) return 'mrr! only mods can add roles to others.';

		if(bundle.pass && !mod) {
			await msg.channel.send("mrr! that bundle has a password. type it below.");

			var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60000});
			if(!resp?.size) return "mrr! no password put in.";

			var m1 = resp?.first();
			if(m1.content != bundle.pass) {
				await m1.delete();
				return "mrr! invalid password. remember that they're case sensitive.";
			}
		}

		var targets;
		if(msg.mentions?.members?.size) targets = msg.mentions.members.map(m => m);
		else targets = [msg.member];
		if(targets.length > 5) return 'mrr! i need 5 or less targets.';

		var failed = [];
		for(var t of targets) {
			try {
				await t.roles.add(bundle.raw_roles);
			} catch(e) {
				failed.push({ name: t.user.username, value: e.message })
			}
		}

		return {embed: {
			title: 'failed',
			description: failed.length ? '' : '(none)',
			fields: failed
		}}
	},
	guildOnly: true,
	alias: ['+', 'a']
}

subcommands.remove = {
	help: ()=> "Remove all of a bundle's roles from yourself or others (latter is mod-only)",
	usage: ()=> [
		" [bundle id] - Removes the given bundle's roles from yourself",
		" [bundle id] [@user @mentions] - Removes the given bundle from the pinged users"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'mrr! i need at least one argument.';

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';

		var mod = msg.member.permissions.has('MANAGE_ROLES');
		if(!bundle.assignable && !mod) return 'mrr! that bundle is mod-only.';
		if(msg.mentions?.members?.first() && !mod) return 'mrr! only mods can remove roles from others.';

		var targets;
		if(msg.mentions?.members?.size) targets = msg.mentions.members.map(m => m);
		else targets = [msg.member];
		if(targets.length > 5) return 'mrr! i need 5 or less targets.';

		var failed = [];
		for(var t of targets) {
			try {
				await t.roles.remove(bundle.raw_roles);
			} catch(e) {
				failed.push({ name: t.user.username, value: e.message })
			}
		}

		return {embed: {
			title: 'failed',
			description: failed.length ? '' : '(none)',
			fields: failed
		}}
	},
	guildOnly: true,
	alias: ['i', 'r', 'rmv']
}

subcommands.rename = {
	help: ()=> "Rename a bundle",
	usage: ()=> [
		" [bundle id] [new name] - Renames the given bundle"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'mrr! i need at least 2 arguments.';

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';

		var name = args.slice(1).join(" ");
		if(name.length > 100) return 'mrr! names should be 100 characters or less.';

		await bot.stores.bundles.update(msg.guild.id, bundle.hid, {name});
		return '*prrr* bundle updated~';
	},
	group: true,
	guildOnly: true,
	alias: ['rn', 'name'],
	permissions: ["MANAGE_ROLES"],
}

subcommands.description = {
	help: ()=> "Change or set the description of a bundle",
	usage: ()=> [
		" [bundle id] [new description] - Sets the description for the given bundle"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'mrr! i need at least 2 arguments.';

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';

		var description = args.slice(1).join(" ");
		if(description.length > 1000) return 'mrr! descriptions should be 1000 characters or less.';

		await bot.stores.bundles.update(msg.guild.id, bundle.hid, {description});
		return '*prrr* bundle updated~';
	},
	group: true,
	guildOnly: true,
	alias: ['desc', 'describe'],
	permissions: ["MANAGE_ROLES"]
}

subcommands.modonly = {
	help: ()=> "Set whether a bundle can be self-assigned or is mod only",
	usage: ()=> [
		" [bundle id] [true|false] - Sets the assignability of the given bundle"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'mrr! i need at least 2 arguments.';

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';

		var assignable = VALUES[args.slice(1).join(" ").toLowerCase()];
		if(assignable == undefined) return 'mrr! invalid value given.';

		await bot.stores.bundles.update(msg.guild.id, bundle.hid, {assignable});
		return '*prrr* bundle updated~';
	},
	group: true,
	guildOnly: true,
	alias: ['mo', 'mod', 'assignable'],
	permissions: ["MANAGE_ROLES"]
}

subcommands.password = {
	help: () => "Set a password for a bundle",
	usage: () => [
		" [bundle id] - View and optionally clear the current password",
		" [bundle id] [password] - Set the password"
	],
	desc: () => "If a password is applied, non-mods will be prompted to send the password " +
				"before the bundle is added to them. **The password message will be deleted!**\n" +
				"Also note that passwords are *case sensitive*, meaning that if your password is "+
				"`wAfflEz`, then users will have to type **exactly that.**",
	async execute(bot, msg, args) {
		if(!args[0]) return "mrr! i need at least a bundle id.";

		var bundle = await bot.stores.bundles.get(msg.guild.id, args[0].toLowerCase());
		if(!bundle) return 'mrr! couldn\'t find that bundle.';

		if(!args[1]) {
			if(!bundle.pass) return "mrr! no password on that bundle.";

			var message = await msg.channel.send(`current password: ${bundle.pass}\nclear it?`);
			['✅', '❌'].forEach(r => message.react(r));

			var conf = await bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			await bot.stores.bundles.update(msg.guild.id, bundle.hid, {pass: null});
			return '*prrr* bundle updated~';
		}

		await bot.stores.bundles.update(msg.guild.id, bundle.hid, {pass: args.slice(1).join(" ")});
		return "*prrr* bundle updated~";
	},
	group: false,
	guildOnly: true,
	alias: ['pass', 'pw'],
	permissions: ['MANAGE_ROLES']
}

subcommands.delete = {
	help: ()=> "Delete a bundle",
	usage: ()=> [
		" [bundle id] - Deletes the given bundle",
		" [all|*] - Deletes ALL bundles"
	],
	desc: () => "Note: Deleting a bundle does NOT delete any actual roles or self roles",
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'mrr! i need at least one argument.';

		var bundles = await bot.stores.bundles.getAll(msg.guild.id);
		if(!bundles?.length) return 'mrr! no bundles to delete.';
		switch(args[0].toLowerCase()) {
			case 'all':
			case '*':
				var message = await msg.channel.send('are you sure you want to delete ALL bundles?');
				['✅', '❌'].forEach(r => message.react(r));
				var conf = await bot.utils.getConfirmation(bot, message, msg.author);
				if(conf.msg) return conf.msg;

				await bot.stores.bundles.deleteAll(msg.guild.id);
				return '*prrr* bundles deleted~';
				break;
			default:
				var bundle = bundles.find(b => b.hid == args[0].toLowerCase());
				if(!bundle) return 'mrr! bundle not found.';
				var message = await msg.channel.send('are you sure you want to delete this bundle?');
				['✅', '❌'].forEach(r => message.react(r));
				var conf = await bot.utils.getConfirmation(bot, message, msg.author);
				if(conf.msg) return conf.msg;

				await bot.stores.bundles.delete(msg.guild.id, bundle.hid);
				return '*prrr* bundle deleted~';
				break;
		}
	},
	group: true,
	guildOnly: true,
	alias: ['d', 'del'],
	permissions: ["MANAGE_ROLES"]
}