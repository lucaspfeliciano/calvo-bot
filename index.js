const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const play = require("play-dl");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const queues = new Map();

client.once("ready", () => {
  console.log("🎵 Bot online!");
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!")) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();
  const query = args.join(" ");

  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel && command !== "!stop" && command !== "!leave") {
    return message.reply("entra em um canal de voz primeiro");
  }

  let queue = queues.get(message.guild.id);

  if (command === "%torugo" || command === "%play") {
    if (!query) return message.reply("Manda link ou nome da música seu burro");

    let song;

    if (play.yt_validate(query) === "video") {
      song = { url: query };
    } else {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) return message.reply("Não achei nada seu tanso 😢");
      song = { url: results[0].url, title: results[0].title };
    }

    if (!queue) {
      queue = {
        songs: [],
        player: createAudioPlayer(),
        connection: joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        }),
      };

      queues.set(message.guild.id, queue);

      queue.player.on(AudioPlayerStatus.Idle, () => {
        queue.songs.shift();
        if (queue.songs.length) {
          playMusic(message.guild.id);
        } else {
          queue.connection.destroy();
          queues.delete(message.guild.id);
        }
      });

      queue.connection.subscribe(queue.player);
    }

    queue.songs.push(song);

    message.reply(
      `🎶 adicionada, toca o pandeiro ai Junin: ${song.title || song.url}`,
    );

    if (queue.songs.length === 1) {
      playMusic(message.guild.id);
    }
  }

  if (command === "!skip" || command === "!netinho") {
    if (!queue) return;
    queue.player.stop();
    message.reply("⏭️ Assim como faço no pau dos crias, pulando...");
  }

  if (command === "!calvo" || command === "!fau") {
    if (!queue) return;
    queue.songs = [];
    queue.player.stop();
    message.reply("⏹️ Sou calvo, parando de tocar");
  }

  if (command === "!mauro" || command === "!leave") {
    if (!queue) return;
    queue.connection.destroy();
    queues.delete(message.guild.id);
    message.reply("👋Sou calvo, saindo");
  }
});

async function playMusic(guildId) {
  const queue = queues.get(guildId);
  const song = queue.songs[0];

  if (!song) return;

  const stream = await play.stream(song.url);

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
  });

  queue.player.play(resource);
}

client.login(process.env.TOKEN);
