const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const play = require("play-dl");
const MAX_COLLECTION_TRACKS = 30;

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

  if (command === "$play") {
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
        textChannel: message.channel,
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
    } else {
      queue.textChannel = message.channel;
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

  if (command === "$stop") {
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
  if (!queue) return;

  const song = queue.songs[0];

  if (!song) return;

  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    queue.player.play(resource);
  } catch (error) {
    console.error("Erro ao tocar música:", error);

    if (!song.triedFallback) {
      song.triedFallback = true;
      const fallbackSong = await buildSongFromSearchHint(
        song.searchHint || song.title,
        song.url,
      );

      if (fallbackSong) {
        queue.songs[0] = fallbackSong;
        if (queue.textChannel) {
          queue.textChannel.send(
            `⚠️ Falhou aqui, tentando fallback: ${fallbackSong.title || fallbackSong.url}`,
          );
        }

        return playMusic(guildId);
      }
    }

    queue.songs.shift();
    if (queue.textChannel) {
      queue.textChannel.send("⚠️ Não consegui tocar essa música, pulando...");
    }

    if (queue.songs.length) {
      playMusic(guildId);
    } else {
      queue.connection.destroy();
      queues.delete(guildId);
    }
  }
}

async function resolveSongs(query) {
  const spotifyType = play.sp_validate(query);
  if (spotifyType === "track") {
    const track = await play.spotify(query);
    const title = `${track.name} - ${track.artists.map((artist) => artist.name).join(", ")}`;
    const match = await searchBestMatch(title);
    if (!match) return [];

    return [{
      url: match.url,
      title,
      source: match.source,
      searchHint: title,
    }];
  }

  if (spotifyType === "album" || spotifyType === "playlist") {
    const spotifyCollection = await play.spotify(query);
    const tracks = await spotifyCollection.all_tracks();

    // Evita filas gigantes e rate-limit em buscas seguidas.
    const limitedTracks = tracks.slice(0, MAX_COLLECTION_TRACKS);
    const resolvedTracks = await Promise.all(
      limitedTracks.map(async (track) => {
        const title = `${track.name} - ${track.artists
          .map((artist) => artist.name)
          .join(", ")}`;
        const match = await searchBestMatch(title);
        if (!match) return null;

        return {
          url: match.url,
          title,
          source: match.source,
          searchHint: title,
        };
      }),
    );

    return resolvedTracks.filter(Boolean);
  }

  const soundCloudType = play.so_validate(query);
  if (soundCloudType === "track") {
    const track = await play.soundcloud(query);
    return [
      {
        url: track.url,
        title: track.name,
        source: "soundcloud",
        searchHint: track.name,
      },
    ];
  }

  if (soundCloudType === "playlist") {
    const playlist = await play.soundcloud(query);
    const tracks = (playlist.tracks || []).slice(0, MAX_COLLECTION_TRACKS);

    return tracks.map((track) => ({
      url: track.url,
      title: track.name,
      source: "soundcloud",
      searchHint: track.name,
    }));
  }

  if (play.yt_validate(query) === "video") {
    return [{ url: query, source: "youtube", searchHint: query }];
  }

  const match = await searchBestMatch(query);
  if (!match) return [];

  return [
    {
      url: match.url,
      title: match.title,
      source: match.source,
      searchHint: query,
    },
  ];
}

async function buildSongFromSearchHint(query, excludeUrl) {
  if (!query) return null;
  const match = await searchBestMatch(query, excludeUrl);
  if (!match) return null;

  return {
    url: match.url,
    title: match.title,
    source: match.source,
    searchHint: query,
    triedFallback: true,
  };
}

async function searchBestMatch(query, excludeUrl = null) {
  const lookups = [
    () => searchWithSource(query, { youtube: "video" }, "youtube"),
    () => searchWithSource(query, { soundcloud: "tracks" }, "soundcloud"),
    () => searchWithSource(query, undefined, "generic"),
  ];

  for (const lookup of lookups) {
    const match = await lookup();
    if (match && match.url !== excludeUrl) {
      return match;
    }
  }

  return null;
}

async function searchWithSource(query, source, sourceLabel) {
  try {
    const options = { limit: 1 };
    if (source) options.source = source;

    const results = await play.search(query, options);
    if (!results.length) return null;

    return {
      url: results[0].url,
      title: results[0].title,
      source: sourceLabel,
    };
  } catch {
    return null;
  }
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
