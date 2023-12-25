module.exports = {
	async genReactPosts(bot, roles, info = {}) {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: info.title,
				description: info.description,
				fields: [],
				footer: info.footer
			}, roles: [], emoji: []};
			
			for(let i=0; i<roles.length; i++) {
				if(current.embed.fields.length < 10) {
					current.embed.fields.push({
						name: `${roles[i].raw.name} (${roles[i].emoji.includes(":") ? `<${roles[i].emoji}>` : roles[i].emoji})`,
						value: `description: ${roles[i].description || "*(no description provided)*"}\npreview: <@&${roles[i].role_id}>`
					});
					current.roles.push(roles[i].id);
					current.emoji.push(roles[i].emoji);
				} else {
					embeds.push(current);
					current = { embed: {
						title: info.title,
						description: info.description,
						fields: [],
						footer: info.footer
					}, roles: [], emoji: []};
					current.embed.fields.push({
						name: `${roles[i].raw.name} (${roles[i].emoji.includes(":") ? `<${roles[i].emoji}>` : roles[i].emoji})`,
						value: `description: ${roles[i].description || "*(no description provided)*"}\npreview: <@&${roles[i].role_id}>`
					});
					current.roles.push(roles[i].id);
					current.emoji.push(roles[i].emoji);
				}
			}
			embeds.push(current);
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += ` (part ${i+1}/${embeds.length})`;
			}
			res(embeds);
		})
	},
}