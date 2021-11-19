module.exports = {
	help: ()=> "Display help embed",
	usage: ()=> [
		" - Displays help for all commands",
		" [command] - Displays help for specfic command",
		" [command] [subcommand] - Displays help for a command's subcommand"
	],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.configs.get(msg.guild.id);
		var prefix = config?.prefix ? config.prefix : bot.prefix;
		if(!args[0]) {
			//setup
			var modules = bot.modules.map(m => m);
			modules.forEach(m => m.commands = m.commands.map(c => c));

			var embeds = [{embed: {
				title: 'about',
				description: "mrr~ i'm ocelot. i handle roles. here's some info about that:",
				fields: [
					{
						name: 'Unlimited reaction roles',
						value: "Every server can have as many reaction roles as they'd like"
					},
					{
						name: 'Reaction categories',
						value: "Reaction roles can be placed in categories, with no limit of " +
							   "how many roles can be in them."
					},
					{
						name: 'Simple syntax',
						value: [
							'Almost all commands can be shortened to aliases with only a few ',
							'characters, allowing you to type as little as possible. Commands are ',
							'also straightforward and clear in what they do.'
						].join('')
					}
				],
				color: parseInt('ffeebb', 16),
				footer: {
					icon_url: bot.user.avatarURL(),
					text: `prrr~ use the reactions below to flip pages, and use "${prefix}help [command] <subcommand>" for more info.`
				}
			}}];
			for(var i = 0; i < modules.length; i++) {
				var tmp_embeds = await bot.utils.genEmbeds(bot, modules[i].commands, c => {
					return {name:  `**${prefix + c.name}**`, value: c.help()}
				}, {
					title: `**${modules[i].name}**`,
					description: modules[i].description,
					color: parseInt(modules[i].color, 16) || parseInt("555555", 16),
					footer: {
						icon_url: bot.user.avatarURL(),
						text: `prrr~ use the reactions below to flip pages, and use "${prefix}help [command] <subcommand>" for more info.`
					}
				}, 10, {addition: ""})
				
				embeds = embeds.concat(tmp_embeds);
			}

			for(let i=0; i<embeds.length; i++) {
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${bot.commands.size} commands total)`;
			}

			return embeds;
		}

		let {command} = await bot.parseCommand(bot, msg, args);
		if(command) {
			var embed = {embed: {
				title: `Help | ${command.name.toLowerCase()}`,
				description: command.help(),
				fields: [
					{name: "**Usage**", value: `${command.usage().map(c => `**${prefix + command.name}**${c}`).join("\n")}`},
					{name: "**Aliases**", value: `${command.alias ? command.alias.join(", ") : "(none)"}`},
					{name: "**Subcommands**", value: `${command.subcommands ?
							command.subcommands.map(sc => `**${prefix}${sc.name}** - ${sc.help()}`).join("\n") : 
							"(none)"}`}
				],
				color: parseInt(command.module.color, 16) || parseInt("555555", 16),
				footer: {
					icon_url: bot.user.avatarURL(),
					text: "arguments like [this] are required, arguments like <this> are optional."
				}
			}};
			if(command.desc) embed.embed.fields.push({name: "**Extra Info**", value: command.desc()});
			if(command.permissions) embed.embed.fields.push({name: "**Permissions**", value: command.permissions.join(", ")});

			return embed;
		} else {
			let module = bot.modules.get(args[0].toLowerCase());
			if(!module) return "mrr! couldn't find that command or module.";
			module.commands = module.commands.map(c => c);

			var embeds = await bot.utils.genEmbeds(bot, module.commands, c => {
				return {name: `**${prefix + c.name}**`, value: c.help()}
			}, {
				title: `**${module.name}**`,
				description: module.description,
				color: parseInt(module.color, 16) || parseInt("555555", 16),
				footer: {
						icon_url: bot.user.avatarURL(),
						text: "prrr~"
					}
			}, 10, {addition: ""});

			for(let i=0; i<embeds.length; i++) {
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${Object.keys(bot.commands).length} commands total)`;
			}

			return embeds;
		}
	},
	alias: ["h", "halp", "?"]
}
