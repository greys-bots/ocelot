# Ocelot
*A role management bot for Discord*

Ocelot is a Discord bot created to help you with role management. They offer reaction roles and categories along with self roles and role bundles.

The bot's default prefix is `oc!`, and you can get help with `oc!h`.

## Getting Started
You can invite Ocelot with [this](https://discord.com/api/oauth2/authorize?client_id=759915866112000021&permissions=268823616&scope=bot). Once you've invited them, you can:
- Change their prefix with `oc!prefix`, if desired
- Set up some self roles with `oc!sr`
- Create react roles with `oc!rr`
- Put those react roles in a category and post it for your users with `oc!rr`

The bot has no required config- you just need to set up what you want!

## Features
### Unlimited self roles
There's no limit to the number of roles you can set up as self roles, aside from Discord's existing limit of 250 roles per server. This means that you can make every role in your server opt-in if you want!

### Unlimited reaction roles
As with self roles, there are no limits here either. As long as you've got a role and an emoji to use, you can create as many reaction roles as you want.

### Mod-only roles
You can set self-roles to be mod-only, meaning that mods with permission to manage roles will be able to use commands to add roles and bundles to multiple users at once. Much faster and handier than the manual way, and it makes it easier to have temporary self roles that are available for certain parts of the year.

### Bundles and categories
Roles can be placed into bundles (without adding them as self roles first 👀) that users can add to themselves to get *all* the roles given to the bundle. Got a lot of event roles, or just wanna bundle some roles that are commonly added at the same time? This is perfect for you!

Reaction roles have their own version called *categories.* The react roles need to be set up first for this, but once you've got all them indexed it's just a matter of creating a category and adding the roles to it. After that, you can post each category to whatever channels you want them in and they're ready to be used.

Bundles and categories automatically remove any roles that no longer exist, and updating a react category will update all its posts as well!

### Extra category functions
Reaction categories come with two extra functions: required roles and a "singular" option. With required roles, a user will have to have a specific role in order to get any of the react roles in the list. With the singular option, users can only get *one* role from that category- attempting to get another role will remove any roles they currently have in that category and only give them the one they've selected.

Required roles are useful for those who want to have a public role channel, but only want verified members to receive roles from it. Singular roles are also a great way to set up faction-related roles, or even color roles!

## Self hosting
### Requirements
**Node:** version 14.0 or higher  
**Database:** PostgreSQL with any recent version  
**Tech:** You should have a hosting computer or VPS; **this bot does not work with Glitch, REPL, or most other "free hosting" websites.**  
You should also have a basic knowledge and understanding of Node, Postgres, and JS, especially if you're making changes!

### Steps
0. Install the requirements mentioned above
1. Download this repository and unzip it somewhere safe
2. Open a terminal in the root folder and use `npm i` to install dependencies
3. Copy the `.env.example` file, rename it to `.env`, and add in the correct values
4. Use `node bot/bot` to run the bot

The bot should now be online and ready to go!

## Support and links
[support server](https://discord.gg/EvDmXGt)  
[our patreon](https://patreon.com/greysdawn)  
[our ko-fi](https://ko-fi.com/greysdawn)