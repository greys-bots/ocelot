module.exports = {
	help: ()=> "Manages self role bundles for the server",
	usage: ()=> [
		" [bundle name or id] - Gets info on a bundle",
		" create <name> | <role ids> - Runs a menu to create a new bundle. Provide the arguments for a quick method",
		" add [bundle id] <@user @mentions> - Adds the given bundle's roles. Mention users to affect them instead",
		" remove [bundle id] <@user @mentions> - Removes the given bundle's roles. Mention users to affect them instead",
		" name [bundle id] [new name] - Changes a bundle's name",
		" description [bundle id] [new description] - Changes a bundle's description",
		" delete [bundle id] - Deletes a bundle. Will not delete the actual roles inside, nor the self roles associated"
	]
}