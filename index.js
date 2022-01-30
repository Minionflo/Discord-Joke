const Discord = require('discord.js');
const https = require('https');
const fs = require('fs');
const got = require('got');
const googleTTS = require('google-tts-api');

global.client = new Discord.Client();
const sleep = (ms = 500) => new Promise((r) => setTimeout(r, ms));

var config_token = process.env.TOKEN
global.config_prefix = process.env.PREFIX
global.config_status = process.env.STATUS
global.config_statustype = process.env.STATUSTYPE
global.config_channel = process.env.CHANNEL
global.config_controlchannel = process.env.CONTROLCHANNEL
global.config_role = process.env.ROLE

if(process.argv.slice(2) == "test") {
    var secret = fs.readFileSync('secret', 'utf8').split(/\r?\n/)
    secret.forEach(function(line) {
        line = line.split("=")
        var name = line[0]
        var value = line[1]
        str = name+' = '+value;
        eval(str)
    })
}

global.connection = null
var player = null
var speaking = null
global.queue = []

client.on('ready', () => {
    activity()
    setInterval(activity, 60000)
    console.log(`Online`)
})

function activity() {
    client.user.setActivity(config_status, {type: config_statustype})
}

async function join() {
    connection = await client.channels.cache.get(config_channel).join();
    return true
}
async function quit() {
    if(connection == null) {
        return false
    }
    connection.disconnect()
    return true
}
async function jokee(msg) {
    await join()
    var jokee = await got('https://witz.api.minionflo.net', {json: true})
    joke = jokee.body.joke
    var joke_tts = googleTTS.getAudioUrl(joke, {
        lang: 'de',
        slow: false,
        host: 'translate.google.com'
    })
    player = await connection.play('https://' + joke_tts)
    player.on('finish', async () => {
        await sleep(300)
        player = await connection.play('./badumtss.mp3')
        player.on('finish', () => {
            quit()
        })
    })
    return joke
}

var cmdmap = {
    join: cmd_join,
    quit: cmd_quit,
    joke: cmd_joke,
    channel: cmd_channel,
    random: cmd_random,
    badumtss: cmd_badumtss,
}

async function cmd_joke(msg, args) {
    await jokee(msg)
    msg.reply("Started joke")
}
async function cmd_join() {await join()}
async function cmd_quit() {await quit()}
async function cmd_channel(msg, args) {
    config_channel = args[0]
    msg.reply("Channel set to " + config_channel)
}
async function cmd_random(msg, args) {
    var random = Math.floor(Math.random() * args[0] * 1000)
    await sleep(random)
    jokee(msg)
}
async function cmd_badumtss(msg, args) {
    await join()
    player = await connection.play('./badumtss.mp3')
    player.on('finish', () => {
        quit()
    })
}

client.on('message', (msg) => {
    var cont   = msg.content,
        member = msg.member,
        chan   = msg.channel,
        guild  = msg.guild,
        author = msg.author

        if(author.id == client.user.id) {return false}
        if(msg.member.roles.cache.has(config_role) == false) {console.log("role"); return false}
        if(msg.channel != client.channels.cache.get(config_controlchannel)) {console.log("channel"); return false}
        if (cont.startsWith(config_prefix)) {
            var invoke = cont.split(' ')[0].substr(config_prefix.length),
                args   = cont.split(' ').slice(1)
            if (invoke in cmdmap) {
                if (cmdmap[invoke](msg, args) == false) {
                    console.log("ERROR")
                }
            }
        }
})

client.on('voiceStateUpdate', async (oldState, newState) => {
    await sleep(500)
    if(newState.id == client.user.id && newState.serverDeaf == false) {
        connection.voice.setDeaf(true)
    }
})

client.login(config_token)