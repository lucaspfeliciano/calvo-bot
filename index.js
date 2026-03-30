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
  if (!message.content.startsWith("$")) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();
  const query = args.join(" ");

  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel && command !== "$stop" && command !== "$leave") {
    return message.reply("Entra em um canal de voz primeiro burrão");
  }

  let queue = queues.get(message.guild.id);

  if (command === "$torugo" || command === "$play") {
    if (!query) return message.reply("Manda link ou nome da música seu burro");

    let songsToAdd;
    try {
      songsToAdd = await resolveSongs(query);
    } catch (error) {
      console.error(error);
      return message.reply("Deu ruim pra processar esse link 😢");
    }

    if (!songsToAdd.length) {
      return message.reply("Não achei nada seu tanso 😢");
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

    queue.songs.push(...songsToAdd);

    const firstSong = songsToAdd[0];
    if (songsToAdd.length === 1) {
      message.reply(
        `🎶 adicionada, toca o pandeiro ai Junin: ${firstSong.title || firstSong.url}`,
      );
    } else {
      message.reply(
        `🎶 ${songsToAdd.length} músicas adicionadas. Primeira da fila: ${firstSong.title || firstSong.url}`,
      );
    }

    if (queue.songs.length === songsToAdd.length) {
      playMusic(message.guild.id);
    }
  }

  if (command === "$skip") {
    if (!queue) return;
    queue.player.stop();
    message.reply("⏭️ Pulando...");
  }

  if (command === "$calvo") {
    if (!queue) return;
    queue.songs = [];
    queue.player.stop();
    message.reply("⏹️ Sou calvo, parando de tocar");
  }

  if (command === "$leave") {
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

async function resolveSongs(query) {
  const spotifyType = play.sp_validate(query);
  if (spotifyType === "track") {
    const track = await play.spotify(query);
    const ytMatch = await searchYouTubeByTrackMeta(track.name, track.artists);
    if (!ytMatch) return [];

    return [
      {
        url: ytMatch.url,
        title: `${track.name} - ${track.artists.map((artist) => artist.name).join(", ")}`,
      },
    ];
  }

  if (spotifyType === "album" || spotifyType === "playlist") {
    const spotifyCollection = await play.spotify(query);
    const tracks = await spotifyCollection.all_tracks();

    // Evita filas gigantes e rate-limit em buscas seguidas.
    const limitedTracks = tracks.slice(0, 20);
    const resolvedTracks = await Promise.all(
      limitedTracks.map(async (track) => {
        const ytMatch = await searchYouTubeByTrackMeta(
          track.name,
          track.artists,
        );
        if (!ytMatch) return null;

        return {
          url: ytMatch.url,
          title: `${track.name} - ${track.artists
            .map((artist) => artist.name)
            .join(", ")}`,
        };
      }),
    );

    return resolvedTracks.filter(Boolean);
  }

  const soundCloudType = play.so_validate(query);
  if (soundCloudType === "track") {
    const track = await play.soundcloud(query);
    return [{ url: track.url, title: track.name }];
  }

  if (play.yt_validate(query) === "video") {
    return [{ url: query }];
  }

  const results = await play.search(query, { limit: 1 });
  if (!results.length) return [];

  return [{ url: results[0].url, title: results[0].title }];
}

async function searchYouTubeByTrackMeta(name, artists = []) {
  const artistNames = artists.map((artist) => artist.name).join(" ");
  const searchQuery = `${name} ${artistNames} audio`;

  const results = await play.search(searchQuery, {
    limit: 1,
    source: { youtube: "video" },
  });

  return results[0] || null;
}

client.login(process.env.TOKEN);
