module.exports = {
	help: ()=> "Change the bot's prefix",
	usage: ()=> [
		' - Views or clears current prefix',
		' [new prefix] - Sets a new prefix'
	],
	execute: async (bot, msg, args) => {
		var config = await bot.stores.configs.get(msg.guild.id);
		if(!args[0]) {
			if(!config?.prefix) return 'mrr! no custom prefix registered.';

			var message = await msg.channel.send(`current prefix: ${config.prefix}\nwould you like to clear it?`);
			['✅','❌'].forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, message, msg.author);
			if(confirm.msg) return confirm.msg;

			try {
				await bot.stores.configs.update(msg.guild.id, {prefix: null});
			} catch(e) {
				return 'mrr! error:\n'+e;
			}

			return '*prrr* prefix cleared~';
		}

		try {
			if(config) await bot.stores.configs.update(msg.guild.id, {prefix: args.join('').toLowerCase()});
			else await bot.stores.configs.create(msg.guild.id, {prefix: args.join('').toLowerCase()});
		} catch(e) {
			return 'mrr! error:\n'+e;
		}

		return '*prrr* prefix updated~';
	},
	alias: ['p'],
	guildOnly: true,
	permissions: ['MANAGE_MESSAGES']
}