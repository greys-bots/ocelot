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
		" add [role ids] <@user @mentions> - Adds self roles. Mention users to add roles to them",
		" remove [role ids] <@user @mentions> - Removes self roles. Mention users to remove roles them",
		" description [role id] [description] - Sets a self-role's description",
		" delete [role id] - Deletes a self-role. Will not delete the role itself"
	],
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
			return {name: dat.name, value: dat.description || "*(no description provided)*"}
		}, {
			title: "self roles",
			description: "all available self roles for the server",
		}, 10);

		return embeds;
	},
	subcommands: {},
	guildOnly: true
}

module.exports.subcommands.index = {
	help: ()=> "Index a self a role",
	usage: ()=> [
		" [role id] [true | false] - Indexes a role, setting whether it can be self-assigned"
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return "mrr! i need at least two arguments.";
		var val = args.pop().toLowerCase();
		var name = args.join(" ").toLowerCase();
		if(!Object.keys(VALUES).find(x => x == val)) return "mrr! last argument invalid. i need a truthy or falsy value."

		try {
			var role = await msg.guild.roles.fetch(args[0].replace(/[<@&>]/g, ""));
			if(!role) role = msg.guild.roles.cache.find(r => r.name.toLowerCase() == name);
			if(!role) return "mrr! role not found.";
		} catch(e) {
			return "mrr! error:\n" + e.message;
		}
	}
}

module.exports.subcommands.add = {

}

module.exports.subcommands.remove = {

}

module.exports.subcommands.description = {

}

module.exports.subcommands.delete = {

}