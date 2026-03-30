const {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  ChannelType,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
const play = require("play-dl");
const ytdl = require("@distube/ytdl-core");
const MAX_COLLECTION_TRACKS = 30;
const JEFF_USER_ID = "691022104812060704";
const RAMON_LIST_CHANNEL_ID = "1233506971190038700";
const TORUGO_URL =
  "https://www.youtube.com/watch?v=0692WFAqRxs&list=RD0692WFAqRxs&start_radio=1";
let hasSoundCloudToken = false;
let soundCloudInitPromise = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const queues = new Map();

client.once("clientReady", async () => {
  await ensureSoundCloudReady();
  console.log("🎵 Bot online!");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith("$")) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();
  const query = args.join(" ");

  const voiceRequiredCommands = new Set(["$play", "$skip", "$torugo"]);
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel && voiceRequiredCommands.has(command)) {
    return message.reply("Entra em um canal de voz primeiro burrão");
  }

  let queue = queues.get(message.guild.id);

  if (command === "$netinho") {
    const pokerJokes = [
      "🃏 Netinho entrou de all-in com 7-2 e falou que era leitura avançada.",
      "♠️ Netinho disse que blefe é arte. A mesa disse que era fanfic.",
      "♥️ A mão do Netinho é tipo Wi-Fi ruim: parece forte, cai no river.",
    ];

    const randomJoke =
      pokerJokes[Math.floor(Math.random() * pokerJokes.length)];
    return message.reply(randomJoke);
  }

  if (command === "$jeff" || command === "$calvo") {
    const muted = await muteJeff(message.guild, `Comando ${command} executado`);
    if (muted) {
      return message.reply(
        "🔇 Jeff mutado com sucesso. Menos 30 minutos de palestra.",
      );
    }

    return message.reply("Jeff não está em canal de voz agora pra mutar.");
  }

  if (command === "$caslu") {
    const result = await moveEveryoneRandomly(message.guild);

    if (!result.ok) {
      return message.reply(result.message);
    }

    return message.reply(
      `🎲 Bagunça do Caslu concluída. ${result.moved} pessoas foram movidas aleatoriamente.`,
    );
  }

  if (command === "$ramon") {
    const result = await createCsLobbyList(message.guild);
    if (!result.ok) {
      return message.reply(result.message);
    }

    return message.reply("✅ Lista do CS criada no canal combinado.");
  }

  if (command === "$lg") {
    const djImagePath = getFirstImageFromPublic();
    if (!djImagePath) {
      return message.reply("Não achei foto na pasta public 😢");
    }

    const attachment = new AttachmentBuilder(djImagePath);
    return message.reply({
      content: "🎧 DJ anão na pista!",
      files: [attachment],
    });
  }

  if (command === "$torugo") {
    if (!queue) {
      queue = createGuildQueue(message.guild, voiceChannel, message.channel);
    } else {
      queue.textChannel = message.channel;
    }

    const torugoSong = {
      url: TORUGO_URL,
      title: "Filho do Piseiro - Hino do Torugo",
      source: "youtube",
      searchHint: "filho do piseiro",
    };

    if (!queue.songs.length) {
      queue.songs.push(torugoSong);
      playMusic(message.guild.id);
    } else {
      // Insere para tocar imediatamente após parar a música atual.
      queue.songs.splice(1, 0, torugoSong);
      queue.player.stop();
    }

    return message.reply("🔥 Torugo ativado. Filho do Piseiro vem aí agora!");
  }

  if (command === "$eduardo") {
    return message.reply(
      "💪 Eduardo, campeonato não define ninguém. Levanta a cabeça, treina e volta mais forte. Tamo junto!",
    );
  }

  if (command === "$tadeu") {
    return message.reply(
      "🍮 Delicio, tua missão é simples: trazer alegria, caos e um combo de lanche pra tropa.",
    );
  }

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
      queue = createGuildQueue(message.guild, voiceChannel, message.channel);
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

function createGuildQueue(guild, voiceChannel, textChannel) {
  const queue = {
    songs: [],
    player: createAudioPlayer(),
    textChannel,
    connection: joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    }),
  };

  queues.set(guild.id, queue);

  queue.player.on(AudioPlayerStatus.Idle, () => {
    queue.songs.shift();
    if (queue.songs.length) {
      playMusic(guild.id);
    } else {
      queue.connection.destroy();
      queues.delete(guild.id);
    }
  });

  queue.connection.subscribe(queue.player);
  return queue;
}

async function muteJeff(guild, reason) {
  try {
    const target = await guild.members.fetch(JEFF_USER_ID);
    if (!target?.voice?.channel) return false;

    await target.voice.setMute(true, reason);
    return true;
  } catch (error) {
    console.error("Erro ao mutar Jeff:", error);
    return false;
  }
}

async function moveEveryoneRandomly(guild) {
  try {
    const voiceChannels = guild.channels.cache.filter(
      (channel) => channel.type === ChannelType.GuildVoice,
    );

    if (!voiceChannels.size) {
      return { ok: false, message: "Não achei salas de voz disponíveis." };
    }

    const membersInVoice = guild.voiceStates.cache
      .filter(
        (voiceState) =>
          Boolean(voiceState.channelId) && !voiceState.member?.user.bot,
      )
      .map((voiceState) => voiceState.member)
      .filter(Boolean);

    if (!membersInVoice.length) {
      return { ok: false, message: "Não tem ninguém em call pra movimentar." };
    }

    const channelsArray = [...voiceChannels.values()];
    let moved = 0;
    await Promise.all(
      membersInVoice.map(async (member) => {
        const randomChannel =
          channelsArray[Math.floor(Math.random() * channelsArray.length)];
        await member.voice.setChannel(randomChannel);
        moved += 1;
      }),
    );

    return { ok: true, moved };
  } catch (error) {
    console.error("Erro ao mover membros:", error);
    return {
      ok: false,
      message:
        "Não consegui mover geral. Verifica se o bot tem permissão de mover membros.",
    };
  }
}

async function createCsLobbyList(guild) {
  try {
    const channel = await guild.channels.fetch(RAMON_LIST_CHANNEL_ID);
    if (!channel?.isTextBased()) {
      return {
        ok: false,
        message: "Canal da lista do CS não encontrado ou não é canal de texto.",
      };
    }

    await channel.send(
      [
        "🎯 **Lista do CS do Ramon**",
        "Responde essa mensagem com teu nick pra entrar no mix:",
        "1. ",
        "2. ",
        "3. ",
        "4. ",
        "5. ",
      ].join("\n"),
    );

    return { ok: true };
  } catch (error) {
    console.error("Erro ao criar lista do CS:", error);
    return {
      ok: false,
      message:
        "Não consegui criar a lista no canal do Ramon. Confere o ID e permissões.",
    };
  }
}

function getFirstImageFromPublic() {
  const publicDir = path.join(__dirname, "public");
  if (!fs.existsSync(publicDir)) return null;

  const files = fs.readdirSync(publicDir);
  const imageFile = files.find((file) =>
    /\.(png|jpg|jpeg|gif|webp)$/i.test(file),
  );
  if (!imageFile) return null;

  return path.join(publicDir, imageFile);
}

function isYouTubeUrl(url) {
  if (!url) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
}

async function playMusic(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  const song = queue.songs[0];

  if (!song) return;

  try {
    try {
      await entersState(queue.connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      // Alguns ambientes demoram para notificar READY; segue tentativa de tocar mesmo assim.
    }

    let resource;
    try {
      const stream = await play.stream(song.url);
      resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });
    } catch (streamError) {
      if (!isYouTubeUrl(song.url)) throw streamError;

      const ytStream = ytdl(song.url, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
      });

      resource = createAudioResource(ytStream, {
        inputType: StreamType.Arbitrary,
      });
    }

    queue.player.play(resource);
  } catch (error) {
    console.error("Erro ao tocar música:", error);
    const isYouTubeBotBlock = /sign in to confirm/i.test(
      String(error?.message || ""),
    );

    if (!song.triedFallback) {
      song.triedFallback = true;
      const fallbackSong = await buildSongFromSearchHint(
        song.searchHint || song.title,
        song.url,
        { preferNonYoutube: isYouTubeBotBlock },
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

    return [
      {
        url: match.url,
        title,
        source: match.source,
        searchHint: title,
      },
    ];
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

  const soundCloudType = await safeValidateSoundCloud(query);
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

async function buildSongFromSearchHint(query, excludeUrl, options = {}) {
  if (!query) return null;
  const match = await searchBestMatch(query, excludeUrl, options);
  if (!match) return null;

  return {
    url: match.url,
    title: match.title,
    source: match.source,
    searchHint: query,
    triedFallback: true,
  };
}

async function searchBestMatch(query, excludeUrl = null, options = {}) {
  const soundCloudReady = await ensureSoundCloudReady();
  const preferNonYoutube = Boolean(options.preferNonYoutube);

  const lookups = preferNonYoutube
    ? [
        ...(soundCloudReady
          ? [
              () =>
                searchWithSource(query, { soundcloud: "tracks" }, "soundcloud"),
            ]
          : []),
        () => searchWithSource(query, { youtube: "video" }, "youtube"),
        () => searchWithSource(query, undefined, "generic"),
      ]
    : [
        () => searchWithSource(query, { youtube: "video" }, "youtube"),
        ...(soundCloudReady
          ? [
              () =>
                searchWithSource(query, { soundcloud: "tracks" }, "soundcloud"),
            ]
          : []),
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

async function ensureSoundCloudReady() {
  if (hasSoundCloudToken) return true;
  if (soundCloudInitPromise) return soundCloudInitPromise;

  soundCloudInitPromise = (async () => {
    try {
      const clientId =
        process.env.SOUNDCLOUD_CLIENT_ID || (await play.getFreeClientID());

      if (!clientId) {
        return false;
      }

      await play.setToken({
        soundcloud: {
          client_id: clientId,
        },
      });

      hasSoundCloudToken = true;
      return true;
    } catch (error) {
      console.warn("SoundCloud indisponível no momento:", error?.message);
      return false;
    } finally {
      soundCloudInitPromise = null;
    }
  })();

  return soundCloudInitPromise;
}

async function safeValidateSoundCloud(query) {
  const soundCloudReady = await ensureSoundCloudReady();
  if (!soundCloudReady) return false;

  try {
    return await play.so_validate(query);
  } catch {
    return false;
  }
}

client.login(process.env.TOKEN);
