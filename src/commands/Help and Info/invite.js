module.exports = {
	help: ()=> "Receive an invite for the bot",
	usage: ()=> [" - Gets an invite for the bot"],
	execute: async (bot, msg, args)=> {
		if(bot.invite) return `*prrr* ask and you shall receive~\n${bot.invite}`;
		else return 'mrr! that command is disabled by the bot owners.';
	},
	alias: ['i', 'inv']
}