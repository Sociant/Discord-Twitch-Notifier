# Discord Twitch Notifier

Discord Twitch Notifier is a mini service for creating messages on discord for new streams on twitch or changing games.

# Installation

To install Twitch Notifier make sure you have nodejs installed with npm or yarn.

### 1. Clone the repository

Clone with HTTPS: https://github.com/Sociant/Discord-Twitch-Notifier.git

Clone with SSH: git@github.com:Sociant/Discord-Twitch-Notifier.git

### 2. Install dependencies with npm or yarn

Run `npm install` or `yarn install`

### 3. Configure the application

Fill out the contents of the given config.js file

Field | Description | Values | Example
---  | --- | --- | ---
botToken | Token for discord bot || Create an application [here](https://discord.com/developers/applications)
botCommand | Command name for discord || testbot
clientID | Twitch Application Client ID || Create an application [here](https://dev.twitch.tv/console)
refreshInterval | Refresh interval for looking up streamer status in ms | 1000 * 30 | Every minute: 1000 * 60

### 4. Run Application

Open a terminal and run the command `npm start` or `yarn start`. You can use `node index.js` as well.

### 5. That's it

Now you can invite your bot to a discord and configure it. For all available commands you can use your botCommand with an exclamation as prefix. (e.g. `!twitchbot`)

# Used Plugins

* [Discord.JS](https://github.com/discordjs/discord.js) by [discordjs](https://github.com/discordjs)
* [Twitch API v5](https://github.com/thedist/Twitch_API_v5) by [thedist](https://github.com/thedist)

# License

Sociant Hub is released under the [Apache-2.0](license.md) License

# Authors

Sociant Hub was created by [l9cgv](https://twitter.com/l9cgv) as Project for [BlusWelt](https://twitter.com/BlusWelt).