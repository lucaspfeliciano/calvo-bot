import { pickTorugoQuery } from "../features/torugo";
import {
  getOrCreateQueue,
  getQueue,
  type QueueTrack,
} from "../features/queue";
import { registerPlayerPanel } from "../features/player-panel";
import { resolveQuery } from "../lavalink";
import type { Command } from "../types";

function trackToQueueItem(track: import("shoukaku").Track, member: import("discord.js").GuildMember | null): QueueTrack {
  return { track, requestedBy: member ?? undefined };
}

async function enqueueQuery(
  query: string,
  voiceChannel: import("discord.js").VoiceBasedChannel,
  textChannel: import("discord.js").TextBasedChannel,
  member: import("discord.js").GuildMember | null,
  insertNext = false,
): Promise<{ ok: true; added: number; name: string } | { ok: false; reason: string }> {
  const result = await resolveQuery(query);

  if (result.kind === "empty") return { ok: false, reason: "Nada encontrado." };
  if (result.kind === "error")
    return { ok: false, reason: `Lavalink error: ${result.message}` };

  const queue = await getOrCreateQueue(
    voiceChannel.guild.id,
    voiceChannel,
    textChannel,
  );

  if (result.kind === "track") {
    const item = trackToQueueItem(result.track, member);
    if (insertNext) queue.insertNext(item);
    else queue.enqueue(item);
    return { ok: true, added: 1, name: result.track.info.title };
  }

  const items = result.tracks.map((t) => trackToQueueItem(t, member));
  queue.enqueueMany(items);
  return { ok: true, added: items.length, name: result.name };
}

export const playCommand: Command = {
  names: ["$play"],
  requiresVoice: true,
  async run({ message, query }) {
    if (!query) return message.reply("Manda link ou nome da música seu burro");

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    registerPlayerPanel(message.guild.id, message.channel);

    try {
      const result = await enqueueQuery(
        query,
        voiceChannel,
        message.channel,
        message.member,
      );
      if (!result.ok)
        return message.reply(`Deu ruim 😢 (${result.reason})`);

      if (result.added === 1) {
        return message.reply(`🎶 Adicionada: ${result.name}`);
      }
      return message.reply(
        `🎶 Playlist adicionada: ${result.name} (${result.added} músicas)`,
      );
    } catch (error) {
      console.error("Erro no $play:", error);
      return message.reply(
        `Deu ruim pra processar essa música 😢 (${error instanceof Error ? error.message : "erro desconhecido"})`,
      );
    }
  },
};

export const skipCommand: Command = {
  names: ["$skip"],
  requiresVoice: true,
  async run({ message }) {
    const queue = getQueue(message.guild.id);
    if (!queue || !queue.current) return message.reply("Não tem nada tocando.");
    await queue.skip();
    return message.reply("⏭️ Pulando...");
  },
};

export const stopCommand: Command = {
  names: ["$stop"],
  async run({ message }) {
    const queue = getQueue(message.guild.id);
    if (!queue || !queue.current) return message.reply("Não tem nada tocando.");
    await queue.stop();
    return message.reply("⏹️ Sou calvo, parando de tocar");
  },
};

export const leaveCommand: Command = {
  names: ["$leave"],
  async run({ message }) {
    const queue = getQueue(message.guild.id);
    if (queue) await queue.destroy();
    return message.reply("👋Sou calvo, saindo");
  },
};

export const nowCommand: Command = {
  names: ["$now"],
  async run({ message }) {
    const queue = getQueue(message.guild.id);
    if (!queue?.current)
      return message.reply("Agora não tem nada tocando 😴");

    const info = queue.current.track.info;
    return message.reply(
      `🎵 Tocando agora: ${info.title} (${info.sourceName || "desconhecida"})`,
    );
  },
};

export const queueCommand: Command = {
  names: ["$queue"],
  async run({ message }) {
    const queue = getQueue(message.guild.id);
    if (!queue?.current) return message.reply("Fila vazia no momento 🫗");

    const upcoming = queue.tracks.slice(0, 10);
    const lines = [
      `🎵 **Agora:** ${queue.current.track.info.title}`,
      `📦 **Na fila:** ${queue.size}`,
    ];

    if (upcoming.length) {
      lines.push("\n**Próximas:**");
      upcoming.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.track.info.title}`);
      });
    }

    if (queue.size > 10) {
      lines.push(`... e mais ${queue.size - 10} música(s)`);
    }

    return message.reply(lines.join("\n"));
  },
};

export const torugoCommand: Command = {
  names: ["$torugo"],
  requiresVoice: true,
  async run({ message }) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    registerPlayerPanel(message.guild.id, message.channel);

    try {
      const torugoQuery = pickTorugoQuery();
      const hadQueue = Boolean(getQueue(message.guild.id)?.current);

      const result = await enqueueQuery(
        torugoQuery,
        voiceChannel,
        message.channel,
        message.member,
        hadQueue, // Se já tinha algo tocando, insere como próxima e pula a atual.
      );
      if (!result.ok)
        return message.reply(`Não consegui invocar o Torugo 😢 (${result.reason})`);

      if (hadQueue) {
        const queue = getQueue(message.guild.id);
        await queue?.skip();
      }
      return message.reply("🔥 Torugo ativado!");
    } catch (error) {
      console.error("Erro no $torugo:", error);
      return message.reply("Não consegui invocar o Torugo agora 😢");
    }
  },
};

export const musicCommands: Command[] = [
  playCommand,
  skipCommand,
  stopCommand,
  leaveCommand,
  nowCommand,
  queueCommand,
  torugoCommand,
];
