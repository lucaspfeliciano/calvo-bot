const {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
const play = require("play-dl");
const MAX_COLLECTION_TRACKS = 30;
const JEFF_USER_ID = "691022104812060704";
const RAMON_LIST_CHANNEL_ID = "1233506971190038700";
const TORUGO_URL =
  "https://www.youtube.com/watch?v=0692WFAqRxs&list=RD0692WFAqRxs&start_radio=1";
const TORUGO_FALLBACK_QUERIES = [
  "filho do piseiro",
  "filho do piseiro junin",
  "hino do torugo",
];
const EDUARDO_QUOTES = [
  "💪 Eduardo, perder faz parte. O próximo campeonato começa no treino de hoje.",
  "🏆 Quer levar campeonato a sério? Disciplina no treino, cabeça fria no jogo e fome de evolução.",
  "⚽ No futevôlei, fundamento ganha jogo: posicionamento, comunicação e regularidade.",
  "🔥 Você não precisa ganhar sempre, mas precisa competir com atitude de quem quer crescer.",
  "🎯 Cada erro no campeonato é dado pra melhorar. Anota, treina e volta mais casca grossa.",
  "🧠 No ponto decisivo, vence quem pensa rápido e executa simples.",
  "📈 Evolução no futevôlei vem de repetição: recepção limpa, levantamento consciente e ataque com leitura.",
  "🤝 Dupla forte é conversa o tempo todo. Chama bola, orienta e confia no parceiro.",
  "🏅 Campeonato se ganha antes: rotina, foco e treino com intenção.",
  "🚀 Jogo grande pede cabeça grande: menos desculpa, mais ajuste e intensidade.",
  "😤 Você até jogou bem, só precisa dar uma trabalhada na comunicação, jogo em dupla, posicionamento, coordenação, timing, confiança, controle de bola, movimentação e noção de jogo que você vai virar um MONSTRO no futevôlei!",
];
const GUI_QUESTIONS = [
  "Você mamaria o Matheus Mazzafera para comer a Ariana Grande?",
  "Você já tentou chupar seu próprio pau?",
  "Você daria o cu por 1 milhão de reais?",
  "Você daria o cu para o Figueirense ganhar uma Libertadores?",
  "Você comeria a Bruna Biancardi para poder comer o Neymar?",
  "Você daria o cu para o Lula para o Flamengo não existir mais?",
  "Você daria o cu para um negão de 2m para a seleção ganhar o Hexa?",
  "Você daría o cu para o Jeff Bezos para nunca mais ter que trabalhar na vida?",
  "Você daria o cu para o Elon Musk para ter acesso à internet de graça pra sempre?",
  "Você daria o cu para o Bill Gates para ter um PC gamer top sem pagar nada?",
  "Você daria o cu para o Mark Zuckerberg para ter acesso ilimitado ao Facebook e Instagram sem ser banido?",
  "Você daria o cu para o Steve Jobs para ter um iPhone grátis pra sempre?",
  "Você daria o cu para o Jeff para nunca mais ouvir falar do Jeff na vida?",
  "Você conhece o jogo do pãozinho?",
];
const MALAFA_SYMPTOMS = [
  { label: "Dor de cabeça", value: "dor_de_cabeca", emoji: "🤕" },
  { label: "Febre", value: "febre", emoji: "🌡️" },
  { label: "Tosse", value: "tosse", emoji: "😮‍💨" },
  { label: "Nariz entupido", value: "nariz_entupido", emoji: "🤧" },
  { label: "Dor no estômago", value: "dor_estomago", emoji: "🤢" },
  { label: "Dor nas costas", value: "dor_costas", emoji: "🪑" },
  { label: "Cansaço extremo", value: "cansaco", emoji: "🥱" },
  { label: "Insônia", value: "insonia", emoji: "🌙" },
  { label: "Fome o tempo todo", value: "fome", emoji: "🍔" },
  { label: "Ansiedade", value: "ansiedade", emoji: "😬" },
];
const MALAFA_DIAGNOSES = [
  {
    title: "Síndrome do RH na Segunda-feira",
    advice: "2 copos d'água, 1 cochilo e zero reunião de alinhamento.",
  },
  {
    title: "Inflamação Aguda de Boleto",
    advice: "Aplicar Pix preventivo e evitar olhar app do banco por 24h.",
  },
  {
    title: "Virose do Open Bar de Ontem",
    advice: "Soro, banho gelado e prometer que nunca mais bebe (mentira).",
  },
  {
    title: "Distúrbio Crônico de CLT",
    advice: "Dose de videogame e exposição controlada ao sol.",
  },
  {
    title: "Colapso de Fim de Mês",
    advice: "Recomendado: miojo gourmet e fé no vale.",
  },
  {
    title: "Transtorno de Wi-Fi Instável",
    advice: "Reinicie o roteador e xingue a operadora em voz baixa.",
  },
  {
    title: "Deficiência de Feriado Prolongado",
    advice: "Prescrever: 3 memes por dia e 1 soneca pós-almoço.",
  },
];
const POKER_REVEAL_DELAY_MS = 1600;
const POKER_BURN_DELAY_MS = 1000;
const MIX_TEAM_SIZE = 5;
const CS_MAP_POOL = [
  "Mirage",
  "Inferno",
  "Nuke",
  "Ancient",
  "Anubis",
  "Dust2",
  "Overpass",
];
let hasSoundCloudToken = false;
let soundCloudInitPromise = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

const queues = new Map();
const mixSessions = new Map();
const picksSessions = new Map();
const csLobbySessions = new Map();

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

  const voiceRequiredCommands = new Set([
    "$play",
    "$skip",
    "$torugo",
    "$netinho",
    "$mix",
    "$picks",
    "$ramon",
  ]);
  const voiceChannel = message.member?.voice.channel;
  if (!voiceChannel && voiceRequiredCommands.has(command)) {
    return message.reply("Entra em um canal de voz primeiro burrão");
  }

  let queue = queues.get(message.guild.id);

  if (command === "$netinho") {
    runNetinhoPoker(message).catch((error) => {
      console.error("Erro no comando $netinho:", error);
      message.reply("Deu erro na mesa do Netinho 😢").catch(() => {});
    });
    return;
  }

  if (command === "$comandos") {
    return message.reply(
      [
        "📜 **Comandos disponíveis**",
        "$comandos - Lista todos os comandos",
        "$play <nome/link> - Adiciona música na fila",
        "$skip - Pula música atual",
        "$stop - Para e limpa fila",
        "$leave - Bot sai da call",
        "$now - Mostra música atual",
        "$queue - Mostra fila",
        "$torugo - Força o hino do Torugo",
        "$netinho - Mesa de poker animada",
        "$cadinho - Rola Fear/Hope (2d12) com animação",
        "$mix - Monta mix com draft de capitães",
        "$picks - Picks/Bans de mapas",
        "$ramon - Abre lobby interativo de CS (line de 5)",
        "$caslu - Move geral aleatoriamente nas calls",
        "$lemos - Mestre dos magos",
        "$lg - DJ anão entra na sala",
        "$eduardo - Frase motivacional do futevolei",
        "$malafa - Triagem de sintomas + diagnóstico duvidoso",
        "$tadeu - Mensagem especial do Delicio",
        "$jeff / $calvo - Muta o Jeff",
        "$pjl / $desmutajeff - Libera o Jeff (desmuta no servidor)",
        "$gui - Enquete aleatória duvidosa",
      ].join("\n"),
    );
  }

  if (command === "$malafa") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`malafa_symptoms_${message.author.id}`)
      .setPlaceholder("Selecione seus sintomas")
      .setMinValues(1)
      .setMaxValues(Math.min(4, MALAFA_SYMPTOMS.length))
      .addOptions(
        MALAFA_SYMPTOMS.map((symptom) => ({
          label: symptom.label,
          value: symptom.value,
          emoji: symptom.emoji,
        })),
      );

    const row = new ActionRowBuilder().addComponents(menu);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🩺 Clínica do Dr. Malafa")
          .setColor(0x3498db)
          .setDescription(
            [
              "Selecione de 1 a 4 sintomas no menu abaixo.",
              "Eu vou te entregar um diagnóstico altamente questionável.",
            ].join("\n"),
          ),
      ],
      components: [row],
    });
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

  if (command === "$pjl" || command === "$desmutajeff") {
    const unmuted = await unmuteJeff(
      message.guild,
      `Comando ${command} executado`,
    );
    if (unmuted) {
      return message.reply("🔊 Jeff liberado. Voltou a falar no servidor.");
    }

    return message.reply(
      "Não consegui liberar o Jeff agora (talvez ele não esteja em call).",
    );
  }

  if (command === "$caslu") {
    return message.reply(`Chega dessa merda de comando`);
  }

  if (command === "$ramon") {
    const result = await startCsLobbyCommand(message);
    if (!result.ok) {
      return message.reply(result.message);
    }
    return message.reply(result.message);
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

  if (command === "$lemos") {
    const lemosImagePath = path.join(__dirname, "public", "lemos.png");
    if (!fs.existsSync(lemosImagePath)) {
      return message.reply("Não achei lemos.png na pasta public 😢");
    }

    const attachment = new AttachmentBuilder(lemosImagePath);
    let disconnectedAuthor = false;

    if (message.member?.voice?.channel) {
      try {
        await message.member.voice.setChannel(null, "Comando $lemos");
        disconnectedAuthor = true;
      } catch {
        // Se não conseguir mover/desconectar, segue com envio da imagem.
      }
    }

    return message.reply({
      content: disconnectedAuthor
        ? "🧙 Mestre dos magos ativado. Você desapareceu da call!"
        : "🧙 Mestre dos magos ativado. Foto enviada, mas você não estava em call.",
      files: [attachment],
    });
  }

  if (command === "$torugo") {
    if (!queue) {
      queue = createGuildQueue(message.guild, voiceChannel, message.channel);
    } else {
      queue.textChannel = message.channel;
    }

    const torugoSong = await resolveTorugoSong();

    if (!queue.songs.length) {
      queue.songs.push(torugoSong);
      updatePlayerPanel(message.guild.id);
      playMusic(message.guild.id);
    } else {
      // Insere para tocar imediatamente após parar a música atual.
      queue.songs.splice(1, 0, torugoSong);
      updatePlayerPanel(message.guild.id);
      queue.player.stop();
    }

    return message.reply(
      `🔥 Torugo ativado. Tocando via ${torugoSong.source || "fallback"}: ${torugoSong.title || torugoSong.url}`,
    );
  }

  if (command === "$eduardo") {
    return message.reply(pickRandom(EDUARDO_QUOTES));
  }

  if (command === "$cadinho") {
    const rollingFrames = ["🎲", "🎲 .", "🎲 . .", "🎲 . . ."];
    const rollMessage = await message.reply(
      [
        "🎲 Cadinho invocou os dados de Daggerheart!",
        "Rolando Fear e Hope...",
      ].join("\n"),
    );

    for (let i = 0; i < 6; i += 1) {
      const tempFear = rollDie(12);
      const tempHope = rollDie(12);
      const frame = rollingFrames[i % rollingFrames.length];

      await rollMessage.edit(
        [
          "🎲 Cadinho invocou os dados de Daggerheart!",
          `${frame} Rolando Fear e Hope...`,
          `😨 Fear (d12): **${tempFear}**`,
          `✨ Hope (d12): **${tempHope}**`,
        ].join("\n"),
      );

      await sleep(450);
    }

    const fearRoll = rollDie(12);
    const hopeRoll = rollDie(12);

    return rollMessage.edit(
      [
        "🎲 Cadinho invocou os dados de Daggerheart!",
        "✅ Resultado final:",
        `😨 Fear (d12): **${fearRoll}**`,
        `✨ Hope (d12): **${hopeRoll}**`,
      ].join("\n"),
    );
  }

  if (command === "$gui") {
    const question = pickRandom(GUI_QUESTIONS);
    const pollMessage = await message.reply(
      [
        "❓ **Enquete do Gui (muito duvidosa):**",
        question,
        "",
        "Reaja com 👍 (sim) ou 👎 (nao).",
      ].join("\n"),
    );

    try {
      await pollMessage.react("👍");
      await pollMessage.react("👎");
    } catch {
      // Se faltar permissão de reação, a enquete continua só com texto.
    }

    return;
  }

  if (command === "$mix") {
    return startMixCommand(message);
  }

  if (command === "$picks") {
    return startPicksCommand(message);
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
    updatePlayerPanel(message.guild.id);

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
    updatePlayerPanel(message.guild.id);
    queue.player.stop();
    message.reply("⏹️ Sou calvo, parando de tocar");
  }

  if (command === "$leave") {
    if (!queue) return;
    queue.connection.destroy();
    queues.delete(message.guild.id);
    disablePlayerPanel(queue);
    message.reply("👋Sou calvo, saindo");
  }

  if (command === "$now") {
    if (!queue || !queue.songs.length) {
      return message.reply("Agora não tem nada tocando 😴");
    }

    const currentSong = queue.songs[0];
    return message.reply(
      `🎵 Tocando agora: ${currentSong.title || currentSong.url} (${currentSong.source || "desconhecida"})`,
    );
  }

  if (command === "$queue") {
    if (!queue || !queue.songs.length) {
      return message.reply("Fila vazia no momento 🫗");
    }

    const currentSong = queue.songs[0];
    const nextSongs = queue.songs.slice(1, 11);

    const lines = [
      `🎵 **Agora:** ${currentSong.title || currentSong.url}`,
      `📦 **Na fila:** ${queue.songs.length - 1}`,
    ];

    if (nextSongs.length) {
      lines.push("\n**Próximas:**");
      nextSongs.forEach((song, index) => {
        lines.push(`${index + 1}. ${song.title || song.url}`);
      });
    }

    if (queue.songs.length > 11) {
      lines.push(`... e mais ${queue.songs.length - 11} música(s)`);
    }

    return message.reply(lines.join("\n"));
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("cs_")) {
    return handleCsLobbyInteraction(interaction);
  }

  if (!interaction.customId.startsWith("player_")) return;

  const [, action, guildId] = interaction.customId.split("_");
  if (!guildId || interaction.guildId !== guildId) {
    return interaction.reply({
      content: "Esse painel não é deste servidor.",
      ephemeral: true,
    });
  }

  const queue = queues.get(guildId);

  if (action === "refresh") {
    await updatePlayerPanel(guildId);
    return interaction.reply({
      content: "Painel atualizado.",
      ephemeral: true,
    });
  }

  if (!queue) {
    return interaction.reply({
      content: "Não tem nada tocando agora.",
      ephemeral: true,
    });
  }

  if (action === "skip") {
    queue.player.stop();
    await interaction.reply({ content: "⏭️ Música pulada.", ephemeral: true });
    return updatePlayerPanel(guildId);
  }

  if (action === "stop") {
    queue.songs = [];
    queue.player.stop();
    await interaction.reply({
      content: "⏹️ Reprodução parada.",
      ephemeral: true,
    });
    return updatePlayerPanel(guildId);
  }

  if (action === "leave") {
    queue.connection.destroy();
    queues.delete(guildId);
    await interaction.reply({
      content: "👋 Saí do canal de voz.",
      ephemeral: true,
    });
    return disablePlayerPanel(queue);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId.startsWith("malafa_")) {
    return handleMalafaInteraction(interaction);
  }

  if (interaction.customId.startsWith("mix_")) {
    return handleMixInteraction(interaction);
  }

  if (interaction.customId.startsWith("picks_")) {
    return handlePicksInteraction(interaction);
  }
});

function createGuildQueue(guild, voiceChannel, textChannel) {
  const queue = {
    songs: [],
    player: createAudioPlayer(),
    textChannel,
    controlMessage: null,
    connection: joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    }),
  };

  queues.set(guild.id, queue);

  queue.player.on(AudioPlayerStatus.Idle, () => {
    handleQueueIdle(guild.id);
  });

  queue.connection.subscribe(queue.player);
  return queue;
}

async function runNetinhoPoker(message) {
  const pokerMessagePromise = message.reply("🃏 Embaralhando as cartas...");
  const players = await getPokerPlayers(
    message.guild,
    message.member?.voice?.channelId,
  );
  const pokerMessage = await pokerMessagePromise;

  if (players.length < 2) {
    return pokerMessage.edit(
      "Não achei jogadores online suficientes pra mesa do Netinho. Preciso de pelo menos 2.",
    );
  }

  const selectedPlayers = shuffle([...players]).slice(0, 6);
  const deck = createDeck();
  shuffle(deck);

  const communityCards = [
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
  ];
  const results = selectedPlayers.map((member) => {
    const holeCards = [drawCard(deck), drawCard(deck)];
    const bestHand = evaluateSevenCards([...holeCards, ...communityCards]);
    return {
      member,
      holeCards,
      bestHand,
    };
  });

  results.sort((a, b) => compareHandsDesc(a.bestHand, b.bestHand));
  const topHand = results[0].bestHand;
  const winners = results.filter(
    (result) => compareHandsDesc(result.bestHand, topHand) === 0,
  );

  await pokerMessage.edit({
    embeds: [buildPokerEmbed({ results, step: "preflop" })],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        step: "burn1",
        suspenseText: "🔥 Queimando uma carta... o flop vem aí.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 1,
        step: "flop1",
        suspenseText: "👀 Primeira carta do flop na mesa...",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS - 200);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 2,
        step: "flop2",
        suspenseText: "😮 Segunda carta revelada...",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS - 200);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 3,
        step: "flop",
        suspenseText: "🟩 Flop completo. As reads comecam.",
      }),
    ],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 3,
        step: "burn2",
        suspenseText: "🔥 Mais uma carta queimada... preparando o turn.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 4,
        step: "turn",
        suspenseText: "🟨 Turn aberto! Quem segurou o all-in?",
      }),
    ],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 4,
        step: "burn3",
        suspenseText: "🔥 Ultima carta queimada... river decisivo.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 5,
        step: "river",
        suspenseText: "🟥 River na mesa. Agora e coracao.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  return pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 5,
        step: "showdown",
        winners,
        suspenseText: "🏁 Showdown! Cartas na mesa.",
      }),
    ],
  });
}

function buildPokerEmbed({
  results,
  communityCards = [],
  revealedCount = 0,
  step,
  winners = [],
  suspenseText = null,
}) {
  const statusByStep = {
    preflop: "🃏 Pré-flop: todo mundo de olho no dealer.",
    burn1: "🔥 Burn card antes do flop.",
    flop1: "👀 Flop começando...",
    flop2: "😮 A mesa tá ficando perigosa.",
    flop: "🟩 Flop aberto.",
    burn2: "🔥 Burn card antes do turn.",
    turn: "🟨 Turn aberto.",
    burn3: "🔥 Burn card antes do river.",
    river: "🟥 River aberto.",
    showdown: "🏁 Showdown.",
  };

  const tableCards = Array.from({ length: 5 }).map((_, index) => {
    const card = communityCards[index];
    if (!card) return "🂠";
    return index < revealedCount ? formatCard(card) : "🂠";
  });

  const playerLines = results.map((result, index) => {
    const hole = result.holeCards.map(formatCard).join(" ");

    const handInfo = step === "showdown" ? ` -> ${result.bestHand.name}` : "";
    return `${index + 1}. ${result.member.displayName}: ${hole}${handInfo}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("Mesa do Netinho")
    .setColor(0x2ecc71)
    .setDescription(
      [
        suspenseText || statusByStep[step] || "Rodada em andamento.",
        `Mesa: ${tableCards.join(" ")}`,
        "Nipes: ♥ Copas | ♦ Ouros | ♣ Paus | ♠ Espadas",
        "",
        "**Jogadores:**",
        ...playerLines,
      ].join("\n"),
    );

  if (step === "showdown") {
    if (winners.length === 1) {
      embed.addFields({
        name: "Vencedor",
        value: `${winners[0].member.displayName} com ${winners[0].bestHand.name}`,
      });
    } else {
      embed.addFields({
        name: "Split Pot",
        value: `${winners.map((winner) => winner.member.displayName).join(", ")} com ${winners[0].bestHand.name}`,
      });
    }
  }

  return embed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function startMixCommand(message) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply("Entra em um canal de voz pra organizar o mix.");
  }

  const participants = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (participants.length < MIX_TEAM_SIZE * 2) {
    return message.reply(
      `Preciso de pelo menos ${MIX_TEAM_SIZE * 2} pessoas no canal pra montar duas lines de ${MIX_TEAM_SIZE}.`,
    );
  }

  if (participants.length > 25) {
    return message.reply(
      "Tem gente demais no canal pra seleção por menu (limite Discord: 25).",
    );
  }

  const sessionId = createSessionId("mix");
  const session = {
    id: sessionId,
    guildId: message.guild.id,
    channelId: voiceChannel.id,
    creatorId: message.author.id,
    participants,
    captains: [],
    teams: {},
    available: [],
    turn: null,
    stage: "captains",
  };

  mixSessions.set(sessionId, session);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mix_captains_${message.author.id}_${sessionId}`)
    .setPlaceholder("Selecione os 2 capitães")
    .setMinValues(2)
    .setMaxValues(2)
    .addOptions(
      participants.map((participant) => ({
        label: truncateLabel(participant.name),
        value: participant.id,
      })),
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Mix - Seleção de Capitães")
        .setColor(0x3498db)
        .setDescription(
          [
            "Quem executou o comando deve escolher 2 capitães.",
            "",
            "**Participantes do canal:**",
            ...participants.map(
              (participant, index) =>
                `${index + 1}. ${participant.name} (<@${participant.id}>)`,
            ),
          ].join("\n"),
        ),
    ],
    components: [row],
  });
}

async function startPicksCommand(message) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply(
      "Entra em um canal de voz pra começar o veto de mapas.",
    );
  }

  const participants = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (participants.length < 2) {
    return message.reply(
      "Preciso de pelo menos 2 pessoas no canal pra escolher capitães.",
    );
  }

  if (participants.length > 25) {
    return message.reply(
      "Tem gente demais no canal pra seleção por menu (limite Discord: 25).",
    );
  }

  const sessionId = createSessionId("picks");
  const session = {
    id: sessionId,
    guildId: message.guild.id,
    channelId: voiceChannel.id,
    creatorId: message.author.id,
    participants,
    captains: [],
    stage: "captains",
    mapPool: [...CS_MAP_POOL],
    steps: [
      { captainIndex: 0, action: "ban" },
      { captainIndex: 1, action: "ban" },
      { captainIndex: 0, action: "pick" },
      { captainIndex: 1, action: "pick" },
      { captainIndex: 0, action: "ban" },
      { captainIndex: 1, action: "ban" },
    ],
    stepIndex: 0,
    bans: [],
    picks: [],
  };

  picksSessions.set(sessionId, session);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`picks_captains_${message.author.id}_${sessionId}`)
    .setPlaceholder("Selecione os 2 capitães")
    .setMinValues(2)
    .setMaxValues(2)
    .addOptions(
      participants.map((participant) => ({
        label: truncateLabel(participant.name),
        value: participant.id,
      })),
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Picks/Bans - Seleção de Capitães")
        .setColor(0xe67e22)
        .setDescription(
          [
            "Quem executou o comando deve escolher 2 capitães.",
            "",
            "**Participantes do canal:**",
            ...participants.map(
              (participant, index) =>
                `${index + 1}. ${participant.name} (<@${participant.id}>)`,
            ),
          ].join("\n"),
        ),
    ],
    components: [row],
  });
}

async function startCsLobbyCommand(message) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return {
      ok: false,
      message: "Entra em um canal de voz pra abrir a line do CS.",
    };
  }

  const participants = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (!participants.length) {
    return {
      ok: false,
      message: "Não achei jogadores no canal de voz atual.",
    };
  }

  const sessionId = createSessionId("cs");
  const session = {
    id: sessionId,
    guildId: message.guild.id,
    textChannelId: message.channel.id,
    voiceChannelId: voiceChannel.id,
    creatorId: message.author.id,
    eligibleIds: participants.map((participant) => participant.id),
    joinedIds: [],
    stage: "open",
    messageId: null,
  };

  const payload = buildCsLobbyPayload(session, participants);
  const lobbyMessage = await message.channel.send(payload);

  session.messageId = lobbyMessage.id;
  csLobbySessions.set(sessionId, session);

  return {
    ok: true,
    message: "✅ Lobby do CS aberto. Usem os botões pra entrar na line de 5.",
  };
}

async function handleCsLobbyInteraction(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const sessionId = parts.slice(2).join("_");

  if (!action || !sessionId) {
    return interaction.reply({
      content: "Interação inválida do lobby de CS.",
      ephemeral: true,
    });
  }

  const session = csLobbySessions.get(sessionId);
  if (!session || session.stage === "done") {
    return interaction.reply({
      content: "Esse lobby já foi encerrado.",
      ephemeral: true,
    });
  }

  if (interaction.guildId !== session.guildId) {
    return interaction.reply({
      content: "Esse lobby não é deste servidor.",
      ephemeral: true,
    });
  }

  if (action === "join") {
    if (!session.eligibleIds.includes(interaction.user.id)) {
      return interaction.reply({
        content:
          "Só quem está no canal de voz onde o lobby foi criado pode entrar.",
        ephemeral: true,
      });
    }

    if (session.joinedIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "Você já está na line.",
        ephemeral: true,
      });
    }

    if (session.joinedIds.length >= 5) {
      return interaction.reply({
        content: "A line já fechou com 5 jogadores.",
        ephemeral: true,
      });
    }

    session.joinedIds.push(interaction.user.id);
  }

  if (action === "leave") {
    if (!session.joinedIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "Você não está na line.",
        ephemeral: true,
      });
    }

    session.joinedIds = session.joinedIds.filter(
      (id) => id !== interaction.user.id,
    );
  }

  if (action === "close") {
    if (interaction.user.id !== session.creatorId) {
      return interaction.reply({
        content: "Só quem abriu o lobby pode encerrar.",
        ephemeral: true,
      });
    }

    session.stage = "done";
    csLobbySessions.delete(sessionId);
    return interaction.update(buildCsLobbyPayload(session, null, true));
  }

  if (session.joinedIds.length >= 5) {
    session.stage = "done";
    csLobbySessions.delete(sessionId);
    return interaction.update(buildCsLobbyPayload(session, null, true));
  }

  return interaction.update(buildCsLobbyPayload(session));
}

function buildCsLobbyPayload(
  session,
  participants = null,
  forceClosed = false,
) {
  const joined = session.joinedIds.map((id, index) => `${index + 1}. <@${id}>`);
  const availableCount =
    (session.eligibleIds || []).length - session.joinedIds.length;
  const isClosed = forceClosed || session.stage === "done";

  const embed = new EmbedBuilder()
    .setTitle("🎯 Lobby do CS - Ramon")
    .setColor(isClosed ? 0x2ecc71 : 0x3498db)
    .setDescription(
      [
        `Canal de voz: <#${session.voiceChannelId}>`,
        `Vagas preenchidas: ${session.joinedIds.length}/5`,
        `Disponíveis no canal: ${Math.max(availableCount, 0)}`,
        "",
        "**Line atual:**",
        joined.join("\n") || "Ninguém entrou ainda.",
        "",
        isClosed
          ? session.joinedIds.length >= 5
            ? "✅ Line fechada com 5 jogadores."
            : "🛑 Lobby encerrado pelo organizador."
          : "Clique em **Entrar** para confirmar presença.",
      ].join("\n"),
    );

  if (participants?.length) {
    embed.addFields({
      name: "Participantes elegíveis",
      value: participants
        .map((participant) => `<@${participant.id}>`)
        .join(", "),
    });
  }

  if (isClosed) {
    return { embeds: [embed], components: [] };
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cs_join_${session.id}`)
      .setLabel("Entrar na line")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cs_leave_${session.id}`)
      .setLabel("Sair da line")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`cs_close_${session.id}`)
      .setLabel("Encerrar")
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

async function handleMixInteraction(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  let sessionId;

  if (action === "captains" && parts.length >= 4) {
    const ownerId = parts[2];
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }

    sessionId = parts.slice(3).join("_");
  } else {
    sessionId = parts.slice(2).join("_");
  }

  if (!action || !sessionId) {
    return interaction.reply({
      content: "Interação inválida para o mix.",
      ephemeral: true,
    });
  }

  const session = mixSessions.get(sessionId);
  if (!session) {
    return interaction.reply({
      content: "Essa sessão de mix já acabou ou expirou.",
      ephemeral: true,
    });
  }

  if (action === "captains") {
    if (interaction.user.id !== session.creatorId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }

    const captains = [...new Set(interaction.values)].slice(0, 2);
    if (captains.length < 2) {
      return interaction.reply({
        content: "Selecione dois capitães diferentes.",
        ephemeral: true,
      });
    }

    session.captains = captains;
    session.teams[captains[0]] = [captains[0]];
    session.teams[captains[1]] = [captains[1]];
    session.available = session.participants
      .map((participant) => participant.id)
      .filter((id) => !captains.includes(id));
    session.turn = captains[0];
    session.stage = "draft";
    normalizeMixTurn(session);

    return interaction.update(buildMixDraftPayload(session));
  }

  if (action === "pick") {
    if (session.stage !== "draft") {
      return interaction.reply({
        content: "Esse draft já foi finalizado.",
        ephemeral: true,
      });
    }

    normalizeMixTurn(session);

    if (interaction.user.id !== session.turn) {
      return interaction.reply({
        content: "Não é sua vez de pickar.",
        ephemeral: true,
      });
    }

    const pickedId = interaction.values[0];
    if (!session.available.includes(pickedId)) {
      return interaction.reply({
        content: "Esse jogador não está mais disponível.",
        ephemeral: true,
      });
    }

    session.teams[session.turn].push(pickedId);
    session.available = session.available.filter((id) => id !== pickedId);

    if (isMixFinished(session)) {
      mixSessions.delete(sessionId);
      return interaction.update(buildMixFinishedPayload(session));
    }

    const otherCaptain = session.captains.find((id) => id !== session.turn);
    session.turn = otherCaptain;
    normalizeMixTurn(session);

    if (isMixFinished(session)) {
      mixSessions.delete(sessionId);
      return interaction.update(buildMixFinishedPayload(session));
    }

    return interaction.update(buildMixDraftPayload(session));
  }

  return null;
}

async function handlePicksInteraction(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  let sessionId;

  if (action === "captains" && parts.length >= 4) {
    const ownerId = parts[2];
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }

    sessionId = parts.slice(3).join("_");
  } else {
    sessionId = parts.slice(2).join("_");
  }

  if (!action || !sessionId) {
    return interaction.reply({
      content: "Interação inválida para picks/bans.",
      ephemeral: true,
    });
  }

  const session = picksSessions.get(sessionId);
  if (!session) {
    return interaction.reply({
      content: "Essa sessão de picks já acabou ou expirou.",
      ephemeral: true,
    });
  }

  if (action === "captains") {
    if (interaction.user.id !== session.creatorId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }

    const captains = [...new Set(interaction.values)].slice(0, 2);
    if (captains.length < 2) {
      return interaction.reply({
        content: "Selecione dois capitães diferentes.",
        ephemeral: true,
      });
    }

    session.captains = captains;
    session.stage = "veto";
    session.stepIndex = 0;

    return interaction.update(buildPicksPayload(session));
  }

  if (action === "map") {
    if (session.stage !== "veto") {
      return interaction.reply({
        content: "Essa sessão de picks/bans já foi finalizada.",
        ephemeral: true,
      });
    }

    const step = session.steps[session.stepIndex];
    if (!step) {
      picksSessions.delete(sessionId);
      return interaction.update(buildPicksFinishedPayload(session));
    }

    const currentCaptain = session.captains[step.captainIndex];
    if (interaction.user.id !== currentCaptain) {
      return interaction.reply({
        content: "Não é sua vez no veto.",
        ephemeral: true,
      });
    }

    const selectedMap = interaction.values[0];
    if (!session.mapPool.includes(selectedMap)) {
      return interaction.reply({
        content: "Esse mapa não está disponível.",
        ephemeral: true,
      });
    }

    session.mapPool = session.mapPool.filter(
      (mapName) => mapName !== selectedMap,
    );

    if (step.action === "ban") {
      session.bans.push({ map: selectedMap, captain: currentCaptain });
    } else {
      session.picks.push({ map: selectedMap, captain: currentCaptain });
    }

    session.stepIndex += 1;

    if (session.stepIndex >= session.steps.length) {
      session.stage = "done";
      picksSessions.delete(sessionId);
      return interaction.update(buildPicksFinishedPayload(session));
    }

    return interaction.update(buildPicksPayload(session));
  }

  return null;
}

async function handleMalafaInteraction(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const ownerId = parts[2];

  if (action !== "symptoms" || !ownerId) {
    return interaction.reply({
      content: "Interação inválida da clínica do Malafa.",
      ephemeral: true,
    });
  }

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "Só quem abriu a consulta pode enviar os sintomas.",
      ephemeral: true,
    });
  }

  const selectedSymptoms = interaction.values
    .map(
      (value) =>
        MALAFA_SYMPTOMS.find((symptom) => symptom.value === value)?.label,
    )
    .filter(Boolean);

  if (!selectedSymptoms.length) {
    return interaction.reply({
      content: "Você precisa selecionar pelo menos 1 sintoma.",
      ephemeral: true,
    });
  }

  const diagnosis = pickRandom(MALAFA_DIAGNOSES);

  return interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("🧾 Diagnóstico do Dr. Malafa")
        .setColor(0xe67e22)
        .setDescription(
          [
            `**Sintomas informados:** ${selectedSymptoms.join(", ")}`,
            "",
            `**Resultado:** ${diagnosis.title}`,
            `**Prescrição:** ${diagnosis.advice}`,
            "",
            "⚠️ Diagnóstico humorístico. Se estiver mal, procure um médico de verdade.",
          ].join("\n"),
        ),
    ],
    components: [],
  });
}

function buildMixDraftPayload(session) {
  const captainA = session.captains[0];
  const captainB = session.captains[1];
  const teamA = (session.teams[captainA] || []).map((id) => `<@${id}>`);
  const teamB = (session.teams[captainB] || []).map((id) => `<@${id}>`);
  const available = session.available;

  const embed = new EmbedBuilder()
    .setTitle("Mix - Draft em andamento")
    .setColor(0x1abc9c)
    .setDescription(
      [
        `Capitão A: <@${captainA}>`,
        `Capitão B: <@${captainB}>`,
        `Vez de: <@${session.turn}>`,
        "",
        `**Time A (${teamA.length}/${MIX_TEAM_SIZE})**`,
        teamA.join("\n") || "-",
        "",
        `**Time B (${teamB.length}/${MIX_TEAM_SIZE})**`,
        teamB.join("\n") || "-",
        "",
        `Disponíveis: ${available.length}`,
      ].join("\n"),
    );

  const options = available.slice(0, 25).map((id) => ({
    label: truncateLabel(getParticipantName(session.participants, id)),
    value: id,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mix_pick_${session.id}`)
    .setPlaceholder("Escolha 1 jogador para o seu time")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

function buildMixFinishedPayload(session) {
  const captainA = session.captains[0];
  const captainB = session.captains[1];
  const teamA = (session.teams[captainA] || []).map((id) => `<@${id}>`);
  const teamB = (session.teams[captainB] || []).map((id) => `<@${id}>`);

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Mix fechado")
        .setColor(0x2ecc71)
        .setDescription(
          [
            "As lines foram formadas.",
            "",
            "**Time A**",
            teamA.join("\n") || "-",
            "",
            "**Time B**",
            teamB.join("\n") || "-",
          ].join("\n"),
        ),
    ],
    components: [],
  };
}

function buildPicksPayload(session) {
  const step = session.steps[session.stepIndex];
  const currentCaptain = session.captains[step.captainIndex];
  const actionLabel = step.action === "ban" ? "BAN" : "PICK";
  const actionText =
    step.action === "ban"
      ? `<@${currentCaptain}> deve banir 1 mapa.`
      : `<@${currentCaptain}> deve pickar 1 mapa.`;

  const embed = new EmbedBuilder()
    .setTitle("Picks/Bans de Mapas")
    .setColor(0xf1c40f)
    .setDescription(
      [
        `Capitão A: <@${session.captains[0]}>`,
        `Capitão B: <@${session.captains[1]}>`,
        "",
        `**Turno ${session.stepIndex + 1}/${session.steps.length} - ${actionLabel}**`,
        actionText,
        "",
        "**Picks até agora:**",
        session.picks.length
          ? session.picks
              .map(
                (pick, index) =>
                  `${index + 1}. ${pick.map} - <@${pick.captain}>`,
              )
              .join("\n")
          : "-",
        "",
        "**Bans até agora:**",
        session.bans.length
          ? session.bans
              .map(
                (ban, index) => `${index + 1}. ${ban.map} - <@${ban.captain}>`,
              )
              .join("\n")
          : "-",
        "",
        `Mapas restantes: ${session.mapPool.join(", ") || "-"}`,
      ].join("\n"),
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`picks_map_${session.id}`)
    .setPlaceholder("Escolha o mapa")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      session.mapPool.map((mapName) => ({
        label: mapName,
        value: mapName,
      })),
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

function buildPicksFinishedPayload(session) {
  const decider = session.mapPool[0] || "Sem decider";

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Picks/Bans finalizados")
        .setColor(0x2ecc71)
        .setDescription(
          [
            `Capitão A: <@${session.captains[0]}>`,
            `Capitão B: <@${session.captains[1]}>`,
            "",
            "**Picks:**",
            session.picks.length
              ? session.picks
                  .map(
                    (pick, index) =>
                      `${index + 1}. ${pick.map} - <@${pick.captain}>`,
                  )
                  .join("\n")
              : "-",
            "",
            "**Bans:**",
            session.bans.length
              ? session.bans
                  .map(
                    (ban, index) =>
                      `${index + 1}. ${ban.map} - <@${ban.captain}>`,
                  )
                  .join("\n")
              : "-",
            "",
            `**Decider:** ${decider}`,
          ].join("\n"),
        ),
    ],
    components: [],
  };
}

function normalizeMixTurn(session) {
  const [captainA, captainB] = session.captains;
  const teamASize = (session.teams[captainA] || []).length;
  const teamBSize = (session.teams[captainB] || []).length;

  if (teamASize >= MIX_TEAM_SIZE && teamBSize < MIX_TEAM_SIZE) {
    session.turn = captainB;
  }

  if (teamBSize >= MIX_TEAM_SIZE && teamASize < MIX_TEAM_SIZE) {
    session.turn = captainA;
  }
}

function isMixFinished(session) {
  const [captainA, captainB] = session.captains;
  return (
    (session.teams[captainA] || []).length >= MIX_TEAM_SIZE &&
    (session.teams[captainB] || []).length >= MIX_TEAM_SIZE
  );
}

function createSessionId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getParticipantName(participants, id) {
  return participants.find((participant) => participant.id === id)?.name || id;
}

function truncateLabel(label) {
  if (!label) return "Sem nome";
  return label.length > 100 ? `${label.slice(0, 97)}...` : label;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

async function getPokerPlayers(guild, channelId) {
  if (!channelId) return [];

  const channelMembers = guild.voiceStates.cache
    .filter(
      (voiceState) =>
        voiceState.channelId === channelId && !voiceState.member?.user.bot,
    )
    .map((voiceState) => voiceState.member)
    .filter(Boolean);

  return uniqueMembersById(channelMembers);
}

function uniqueMembersById(members) {
  const byId = new Map();
  members.forEach((member) => {
    byId.set(member.id, member);
  });
  return [...byId.values()];
}

function createDeck() {
  const suits = ["H", "D", "C", "S"];
  const ranks = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "T",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck = [];

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({ rank, suit });
    });
  });

  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCard(deck) {
  return deck.pop();
}

function formatCard(card) {
  const suitLabels = {
    H: { symbol: "♥", short: "Copas" },
    D: { symbol: "♦", short: "Ouros" },
    C: { symbol: "♣", short: "Paus" },
    S: { symbol: "♠", short: "Espadas" },
  };
  const rankLabels = {
    T: "10",
  };

  const suit = suitLabels[card.suit] || { symbol: card.suit, short: card.suit };
  const rank = rankLabels[card.rank] || card.rank;

  return `${rank}${suit.symbol}(${suit.short})`;
}

function cardValue(rank) {
  const values = {
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };

  return values[rank];
}

function evaluateSevenCards(cards) {
  let best = null;

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const hand = evaluateFiveCards([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ]);

            if (!best || compareHandsDesc(hand, best) < 0) {
              best = hand;
            }
          }
        }
      }
    }
  }

  return best;
}

function evaluateFiveCards(cards) {
  const sortedValues = cards
    .map((card) => cardValue(card.rank))
    .sort((a, b) => b - a);
  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(sortedValues);

  const countMap = new Map();
  sortedValues.forEach((value) => {
    countMap.set(value, (countMap.get(value) || 0) + 1);
  });

  const groups = [...countMap.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (isFlush && straightHigh) {
    return createHand(8, [straightHigh], "Straight Flush");
  }

  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups.find((group) => group[0] !== quad)[0];
    return createHand(7, [quad, kicker], "Quadra");
  }

  if (groups[0][1] === 3 && groups[1]?.[1] >= 2) {
    return createHand(6, [groups[0][0], groups[1][0]], "Full House");
  }

  if (isFlush) {
    return createHand(5, sortedValues, "Flush");
  }

  if (straightHigh) {
    return createHand(4, [straightHigh], "Sequencia");
  }

  if (groups[0][1] === 3) {
    const kickers = groups
      .filter((group) => group[1] === 1)
      .map((group) => group[0])
      .sort((a, b) => b - a);
    return createHand(3, [groups[0][0], ...kickers], "Trinca");
  }

  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairValues = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups.find((group) => group[1] === 1)[0];
    return createHand(2, [...pairValues, kicker], "Dois Pares");
  }

  if (groups[0][1] === 2) {
    const pairValue = groups[0][0];
    const kickers = groups
      .filter((group) => group[1] === 1)
      .map((group) => group[0])
      .sort((a, b) => b - a);
    return createHand(1, [pairValue, ...kickers], "Par");
  }

  return createHand(0, sortedValues, "Carta Alta");
}

function createHand(category, tiebreak, name) {
  return { category, tiebreak, name };
}

function getStraightHigh(valuesDesc) {
  const uniqueDesc = [...new Set(valuesDesc)].sort((a, b) => b - a);
  if (uniqueDesc.includes(14)) {
    uniqueDesc.push(1);
  }

  let run = 1;
  let high = uniqueDesc[0];

  for (let i = 1; i < uniqueDesc.length; i += 1) {
    if (uniqueDesc[i - 1] - 1 === uniqueDesc[i]) {
      run += 1;
      if (run >= 5) return high;
    } else {
      run = 1;
      high = uniqueDesc[i];
    }
  }

  return null;
}

function compareHandsDesc(a, b) {
  if (a.category !== b.category) {
    return b.category - a.category;
  }

  const maxLength = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = a.tiebreak[i] || 0;
    const right = b.tiebreak[i] || 0;
    if (left !== right) return right - left;
  }

  return 0;
}

async function handleQueueIdle(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  queue.songs.shift();
  await updatePlayerPanel(guildId);

  if (queue.songs.length) {
    playMusic(guildId);
  } else {
    queue.connection.destroy();
    queues.delete(guildId);
    disablePlayerPanel(queue);
  }
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

async function unmuteJeff(guild, reason) {
  try {
    const target = await guild.members.fetch(JEFF_USER_ID);
    if (!target?.voice?.channel) return false;

    await target.voice.setMute(false, reason);
    return true;
  } catch (error) {
    console.error("Erro ao liberar Jeff:", error);
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

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    queue.player.play(resource);
    updatePlayerPanel(guildId);
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
        updatePlayerPanel(guildId);
        if (queue.textChannel) {
          queue.textChannel.send(
            `⚠️ Falhou aqui, tentando fallback: ${fallbackSong.title || fallbackSong.url}`,
          );
        }

        return playMusic(guildId);
      }
    }

    queue.songs.shift();
    updatePlayerPanel(guildId);
    if (queue.textChannel) {
      queue.textChannel.send("⚠️ Não consegui tocar essa música, pulando...");
    }

    if (queue.songs.length) {
      playMusic(guildId);
    } else {
      queue.connection.destroy();
      queues.delete(guildId);
      disablePlayerPanel(queue);
    }
  }
}

function buildPlayerControls(guildId, disabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`player_skip_${guildId}`)
      .setLabel("Pular")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_stop_${guildId}`)
      .setLabel("Parar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_leave_${guildId}`)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_refresh_${guildId}`)
      .setLabel("Atualizar")
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildPlayerEmbed(queue) {
  const currentSong = queue?.songs?.[0];
  const queueLength = Math.max((queue?.songs?.length || 0) - 1, 0);

  const embed = new EmbedBuilder().setTitle("Jeff Player");

  if (!currentSong) {
    embed
      .setDescription("Sem música tocando no momento.")
      .setColor(0x808080)
      .addFields({ name: "Fila", value: "0" });
    return embed;
  }

  embed
    .setDescription(`🎵 ${currentSong.title || currentSong.url}`)
    .setColor(0x00b894)
    .addFields(
      {
        name: "Fonte",
        value: String(currentSong.source || "desconhecida"),
        inline: true,
      },
      { name: "Na fila", value: String(queueLength), inline: true },
    );

  return embed;
}

async function updatePlayerPanel(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.textChannel) return;

  const embed = buildPlayerEmbed(queue);
  const controls = buildPlayerControls(guildId, !queue.songs.length);

  try {
    if (queue.controlMessage) {
      await queue.controlMessage.edit({
        embeds: [embed],
        components: [controls],
      });
      return;
    }

    queue.controlMessage = await queue.textChannel.send({
      embeds: [embed],
      components: [controls],
    });
  } catch {
    queue.controlMessage = null;
  }
}

async function disablePlayerPanel(queue) {
  if (!queue?.controlMessage) return;

  try {
    const embed = buildPlayerEmbed({ songs: [] });
    const controls = buildPlayerControls("offline", true);
    await queue.controlMessage.edit({
      embeds: [embed],
      components: [controls],
    });
  } catch {
    // Ignore erro de edição de mensagem antiga/apagada.
  }
}

async function resolveSongs(query) {
  const spotifyType = play.sp_validate(query);
  if (spotifyType === "track") {
    const track = await play.spotify(query);
    const title = `${track.name} - ${track.artists.map((artist) => artist.name).join(", ")}`;
    const match = await searchBestMatch(title);
    if (!match) return [];

    const playableSong = await ensurePlayableSong({
      url: match.url,
      title,
      source: match.source,
      searchHint: title,
    });

    return playableSong ? [playableSong] : [];
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

        return ensurePlayableSong({
          url: match.url,
          title,
          source: match.source,
          searchHint: title,
        });
      }),
    );

    return resolvedTracks.filter(Boolean);
  }

  const soundCloudType = await safeValidateSoundCloud(query);
  if (soundCloudType === "track") {
    const track = await play.soundcloud(query);
    const playableSong = await ensurePlayableSong({
      url: track.url,
      title: track.name,
      source: "soundcloud",
      searchHint: track.name,
    });

    return playableSong ? [playableSong] : [];
  }

  if (soundCloudType === "playlist") {
    const playlist = await play.soundcloud(query);
    const tracks = (playlist.tracks || []).slice(0, MAX_COLLECTION_TRACKS);

    const playableSongs = await Promise.all(
      tracks.map((track) =>
        ensurePlayableSong({
          url: track.url,
          title: track.name,
          source: "soundcloud",
          searchHint: track.name,
        }),
      ),
    );

    return playableSongs.filter(Boolean);
  }

  if (play.yt_validate(query) === "video") {
    const playableSong = await ensurePlayableSong({
      url: query,
      source: "youtube",
      searchHint: query,
      title: query,
    });

    return playableSong ? [playableSong] : [];
  }

  const match = await searchBestMatch(query);
  if (!match) return [];

  const playableSong = await ensurePlayableSong({
    url: match.url,
    title: match.title,
    source: match.source,
    searchHint: query,
  });

  return playableSong ? [playableSong] : [];
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

async function resolveTorugoSong() {
  for (const query of TORUGO_FALLBACK_QUERIES) {
    const match = await searchBestMatch(query, null, {
      preferNonYoutube: true,
    });
    if (!match) continue;

    const playableSong = await ensurePlayableSong({
      url: match.url,
      title: match.title || "Filho do Piseiro - Hino do Torugo",
      source: match.source,
      searchHint: query,
    });

    if (playableSong) return playableSong;
  }

  const fixedSong = await ensurePlayableSong({
    url: TORUGO_URL,
    title: "Filho do Piseiro - Hino do Torugo",
    source: "youtube-fixed",
    searchHint: "filho do piseiro",
  });

  return (
    fixedSong || {
      url: TORUGO_URL,
      title: "Filho do Piseiro - Hino do Torugo",
      source: "youtube-fixed",
      searchHint: "filho do piseiro",
    }
  );
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
        ...(soundCloudReady
          ? [
              () =>
                searchWithSource(query, { soundcloud: "tracks" }, "soundcloud"),
            ]
          : []),
        () => searchWithSource(query, { youtube: "video" }, "youtube"),
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
    const options = { limit: 5 };
    if (source) options.source = source;

    const results = await play.search(query, options);
    if (!results.length) return null;

    for (const result of results) {
      if (!result?.url) continue;
      const streamable = await canStreamUrl(result.url);
      if (!streamable) continue;

      return {
        url: result.url,
        title: result.title,
        source: sourceLabel,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function ensurePlayableSong(song) {
  if (!song?.url) return null;

  const streamable = await canStreamUrl(song.url);
  if (streamable) return song;

  return buildSongFromSearchHint(song.searchHint || song.title, song.url, {
    preferNonYoutube: true,
  });
}

async function canStreamUrl(url) {
  try {
    const stream = await play.stream(url);
    if (stream?.stream?.destroy) {
      stream.stream.destroy();
    }
    return true;
  } catch {
    return false;
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
