module.exports = {
	help: ()=> "Receive an invite for the bot.",
	usage: ()=> [" - Gets an invite for the bot."],
	execute: async (bot, msg, args)=> {
		if(bot.invite) return `You can invite me with this:\n${bot.invite}`;
		else return 'That command is currently disabled by the bot owners.';
	},
	alias: ['i', 'inv']
}