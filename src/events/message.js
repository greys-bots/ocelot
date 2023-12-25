const WELCOMES = [
	"welcome~",
	"prrrrr :orange_heart:",
	"of course~",
	":orange_heart: ~"
];

module.exports = async (msg, bot)=>{
	if(msg.author.bot) return;
	var config = await bot.stores.configs.get(msg.guild?.id);
	var prefix = config?.prefix ? config.prefix : bot.prefix;
	if(!msg.content.toLowerCase().startsWith(prefix)) {
		var thanks = msg.content.match(/^(thanks? ?(you)?|ty),? ?oc(elot)?/i);
		if(thanks) return await msg.channel.send(WELCOMES[Math.floor(Math.random() * WELCOMES.length)]);
		return;
	}
	var log = [
		`Guild: ${msg.guild?.name || "DMs"} (${msg.guild?.id || msg.channel.id})`,
		`User: ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
		`Message: ${msg.content}`,
		`--------------------`
	];

	var content = msg.content.slice(prefix.length);
	let {command, args} = await bot.handlers.command.parse(content);
	if(!command) {
		log.push('- Command not found -');
		console.log(log.join('\r\n'));
		return await msg.channel.send("Command not found!");
	}
	
	try {
		await bot.handlers.command.handle({command, args, msg, config});
	} catch(e) {
		console.log(e);
		log.push(`Error: ${e}`);
		log.push(`--------------------`);
		await msg.channel.send('There was an error!')
	}
	console.log(log.join('\r\n'));
}