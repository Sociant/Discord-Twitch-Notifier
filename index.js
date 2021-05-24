console.log("Starting Discord-Twitch-Notifier Service")

var userConfig = {
    accounts: [],
}

const fs = require("fs")

const config = require("./config")
const Discord = require("discord.js")
var twitchAPI = require("twitch-api-v5")

twitchAPI.clientID = config.twitch.clientID

const client = new Discord.Client()

const commandPrefix = "!"

var pendingUsers = []

function readUserConfigFile() {
    if (fs.existsSync("./userconfig.json"))
        userConfig = JSON.parse(fs.readFileSync("./userconfig.json", "utf8"))
}

function writeUserConfigFile() {
    fs.writeFileSync("./userconfig.json", JSON.stringify(userConfig), "utf8")
}

readUserConfigFile()

function getStreamToken(stream) {
    return Date.parse(stream.created_at) + "-" + encodeURIComponent(stream.game)
}

function convertMessage(input, stream) {
    const matches = {
        "%game%": stream.game,
        "%displayName%": stream.channel.display_name,
        "%status%": stream.channel.status,
        "%url%": stream.channel.url,
        "%description%": stream.channel.description,
    }

    return input.replace(
        new RegExp(Object.keys(matches).join("|"), "gi"),
        (matched) => matches[matched]
    )
}

function checkStreams() {
    var date = new Date()

    console.log(date.toTimeString() + ": Checking streams...")
    userConfig.accounts.forEach((user) => {
        twitchAPI.streams.channel({ channelID: user.id }, (error, result) => {
            if (!error) {
                if (typeof user.lastMessage == "undefined") {
                    user.lastMessage = Date.now()
                    writeUserConfigFile()
                }

                if (result.stream != null) {
                    const streamToken = getStreamToken(result.stream)

                    if (user.currentStreamToken !== streamToken) {
                        user.isLive = true
                        user.currentStreamToken = streamToken

                        const changedGame =
                            user.currentStreamStart === result.stream.created_at

                        user.currentStreamStart = result.stream.created_at

                        client.channels
                            .fetch(user.channel)
                            .then((channel) =>
                                channel.send(
                                    convertMessage(
                                        changedGame
                                            ? user.changeMessage || user.message
                                            : user.message,
                                        result.stream
                                    )
                                )
                            )

                        if (changedGame)
                            console.log(
                                `${date.toTimeString()}: ${
                                    user.displayName
                                } changed game to ${result.stream.game}`
                            )
                        else
                            console.log(
                                `${date.toTimeString()}: ${
                                    user.displayName
                                } is live with ${result.stream.game}`
                            )

                        writeUserConfigFile()
                    }
                } else if (result.stream == null && user.isLive) {
                    user.isLive = false
                    writeUserConfigFile()

                    console.log(
                        `${date.toTimeString()}: ${
                            user.displayName
                        } is no longer live`
                    )
                }
            }
        })
    })
}

client.on("message", function (message) {
    if (message.author.bot) return
    if (!message.member.hasPermission("ADMINISTRATOR")) return
    if (!message.content.startsWith(commandPrefix)) return

    const commandBody = message.content.slice(commandPrefix.length)
    const args = commandBody.split(" ")
    const command = args.shift().toLowerCase()

    const botCommand = config.discord.botCommand

    if (command == botCommand) {
        if (args.length == 0) {
            message.reply(
                `hier sind alle Befehle für den Bot:

                !${botCommand} twitch list - Twitch Nutzer auflisten
                !${botCommand} twitch add [Nutzername] [Nachricht...] - Twitch Nutzer hinzufügen (Mit Startnachricht)
                !${botCommand} twitch edit-start [Nutzername] [Nachricht...] - Start-Nachricht für einen neuen Stream für Twitch Nutzer bearbeiten
                !${botCommand} twitch edit-change [Nutzername] [Nachricht...] - Nachricht für das Wechseln eines Spiel für Twitch Nutzer bearbeiten
                !${botCommand} twitch remove [Nutzername] - Twitch Nutzer entfernen
                
                Tipp: Verwende folgende Variablen für die Nachrichten:
                %game%: Aktuelles Spiel
                %displayName%: Anzeigename
                %status%: Status
                %description%: Kanalbeschreibung
                %url%: Twitch-URL`.replace(/  +/g, "")
            )
        } else {
            if (args[0] == "twitch" && args.length > 1) {
                if (args[1] == "list") {
                    var response = `Ich habe ${userConfig.accounts.length} Account(s) gefunden\n`
                    userConfig.accounts.forEach((account) => {
                        response += `${account.displayName} (${account.name}) mit der Nachricht "${account.message}"\n`
                    })

                    message.reply(response)
                } else if (args[1] == "add") {
                    if (args.length < 4)
                        message.reply(
                            `Bitte gib einen Nutzernamen an. !${botCommand} twitch add [Nutzername] [Nachricht...]`
                        )
                    else {
                        message.reply(
                            `Ich suche nach Accouns mit dem Nutzernamen ${args[2]}...`
                        )

                        twitchAPI.users.usersByName(
                            { users: args[2] },
                            (error, result) => {
                                if (error)
                                    message.channel.send(
                                        "Bei der Suche ist ein Fehler aufgetreten."
                                    )
                                else {
                                    var response = `Ich habe ${result._total} Account(s) gefunden:\n\n`
                                    var index = 1

                                    result.users.forEach((user) => {
                                        response += `${index}. ${user.display_name} (${user.name})\n`
                                        index++

                                        pendingUsers.push({
                                            displayName: user.display_name,
                                            name: user.name,
                                            id: user._id,
                                            channel: message.channel.id,
                                            message: args.slice(3).join(" "),
                                            creator: message.author.id,
                                            isLive: false,
                                            currentStreamStart: null,
                                            currentStreamToken: null,
                                        })
                                    })

                                    response += `\nWenn der erwünschte Nutzer aufgelistet ist, gib !${botCommand} twitch confirm [Nutzername] ein. Verwende den Nutzernamen in Klammern. Anschließend werden alle Streams hier aufgelistet.`
                                }

                                message.channel.send(response)
                            }
                        )
                    }
                } else if (args[1] == "edit-start") {
                    if (args.length < 4)
                        message.reply(
                            `Bitte gib einen Nutzernamen an. !${botCommand} twitch edit-start [Nutzername] [Nachricht...]`
                        )
                    else {
                        var target = userConfig.accounts.findIndex(
                            (user) => user.name == args[2]
                        )
                        if (target != -1) {
                            userConfig.accounts[target].message = args
                                .slice(3)
                                .join(" ")
                            writeUserConfigFile()
                            message.reply(
                                `Ich habe die Start-Nachricht für den Nutzer ${args[2]} bearbeitet.`
                            )
                        } else {
                            message.reply(
                                `Ich konnte den Nutzer ${args[2]} nicht finden.`
                            )
                        }
                    }
                } else if (args[1] == "edit-change") {
                    if (args.length < 4)
                        message.reply(
                            `Bitte gib einen Nutzernamen an. !${botCommand} twitch edit-change [Nutzername] [Nachricht...]`
                        )
                    else {
                        var target = userConfig.accounts.findIndex(
                            (user) => user.name == args[2]
                        )
                        if (target != -1) {
                            userConfig.accounts[target].changeMessage = args
                                .slice(3)
                                .join(" ")
                            writeUserConfigFile()
                            message.reply(
                                `Ich habe die Wechsel-Nachricht für den Nutzer ${args[2]} bearbeitet.`
                            )
                        } else {
                            message.reply(
                                `Ich konnte den Nutzer ${args[2]} nicht finden.`
                            )
                        }
                    }
                } else if (args[1] == "confirm" && args.length >= 3) {
                    const username = args[2]
                    var pendingUser = null

                    pendingUsers.forEach((user) => {
                        if (
                            user.name == username &&
                            user.creator == message.author.id
                        )
                            pendingUser = user
                    })

                    if (pendingUser == null)
                        message.reply(
                            "Ich konnte keinen Nutzer mit dieserm Namen finden."
                        )
                    else {
                        userConfig.accounts.push(pendingUser)
                        writeUserConfigFile()

                        pendingUsers = pendingUsers.filter(
                            (user) => user.creator != message.author.id
                        )

                        message.reply(
                            `Ich habe den Nutzer ${pendingUser.displayName} (${pendingUser.name}) hinzugefügt.`
                        )

                        checkStreams()
                    }
                } else if (args[1] == "remove") {
                    if (args.length < 3)
                        message.reply(
                            `Bitte gib einen Nutzernamen an. !${botCommand} twitch remove [Nutzername]`
                        )
                    else {
                        var target = userConfig.accounts.findIndex(
                            (user) => user.name == args[2]
                        )
                        if (target != -1) {
                            userConfig.accounts.splice(target, 1)
                            writeUserConfigFile()
                            message.reply(
                                `Ich habe den Nutzer ${args[2]} entfernt.`
                            )
                        } else {
                            message.reply(
                                `Ich konnte den Nutzer ${args[2]} nicht finden.`
                            )
                        }
                    }
                }
            }
        }
    }
})

client.login(config.discord.botToken)
client.on("ready", () => {
    checkStreams()
    setInterval(checkStreams, config.refreshInterval)
})
