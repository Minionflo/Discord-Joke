const Discord = require('discord.js');
const fs = require('fs');
const got = require('got');
const googleTTS = require('google-tts-api');
const app = require('express')();

global.client = new Discord.Client();
app.listen("80", () => console.log("Started"))
const sleep = (ms = 500) => new Promise((r) => setTimeout(r, ms));

var config_token = process.env.TOKEN
global.config_prefix = process.env.PREFIX
global.config_status = process.env.STATUS
global.config_statustype = process.env.STATUSTYPE
global.config_channel = process.env.CHANNEL
global.config_controlchannel = process.env.CONTROLCHANNEL
global.config_role = process.env.ROLE
global.config_permanent_talk = process.env.PERMANENT_TALK

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

app.get("/joke", (req, res) => {
    res.status(200)
    jokee()
    res.end("OK");
})

app.get("/sound/:sound", (req, res) => {
    res.status(200)
    sound(req.params.sound)
    res.end("OK");
})

app.get("/speak/:text", (req, res) => {
    res.status(200)
    cmd_speak(null, req.params.text.split(" "))
    res.end("OK");
})


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
    if(config_permanent_talk != "true") {
        connection.disconnect()
    }
    return true
}
async function jokee() {
    await join()
    var jokee = await got('https://witz.api.minionflo.net', {json: true})
    joke = await jokee.body.joke
    var joke_tts = await googleTTS.getAudioUrl(joke, { lang: 'de', slow: false, host: 'translate.google.com' })
    player = await connection.play('https://' + joke_tts)
    await player.once('finish', async () => {
        await sleep(300)
        player = await connection.play('./sound/badumtss.mp3')
        await sleep(2500)
        await quit()
    })
    return joke
}

async function sound(soud) {
    await join()
    player = await connection.play('./sound/' + soud + '.mp3')
    player.on('finish', () => {
        quit()
    })
}

var cmdmap = {
    join: cmd_join,
    quit: cmd_quit,
    sound: cmd_sound,
    joke: cmd_joke,
    speak: cmd_speak
}

async function cmd_join() {await join()}
async function cmd_quit() {await quit()}
async function cmd_joke(msg, args) {
    jokee()
    msg.channel.send("Joke started")
}
async function cmd_sound(msg, args) {
    sound(args[0])
}

async function cmd_speak(msg, args) {
    await join()
    var speakk = args.join(" ")
    var joke_tts = await googleTTS.getAudioUrl(speakk, { lang: 'de', slow: false, host: 'translate.google.com' })
    player = await connection.play('https://' + joke_tts)
    await player.once('finish', async () => {
        await sleep(300)
        await quit()
    })
    return speakk
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