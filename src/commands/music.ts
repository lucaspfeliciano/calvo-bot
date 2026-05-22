import { distube } from "../distube";
import { pickTorugoQuery } from "../features/torugo";
import {
  deletePlayerPanel,
  disablePlayerPanel,
  getPlayerPanel,
  registerPlayerPanel,
} from "../features/player-panel";
import type { Command } from "../types";

function summarizePlayError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (!raw) return "erro desconhecido";

  if (/sign in to confirm/i.test(raw)) {
    return "YouTube exigiu autenticação anti-bot. Tenta um link do SoundCloud ou Spotify.";
  }

  const firstLine = raw.split("\n").find((line) => line.trim().length > 0) ?? raw;
  const trimmed = firstLine.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
}

export const playCommand: Command = {
  names: ["$play"],
  requiresVoice: true,
  async run({ message, query }) {
    if (!query) return message.reply("Manda link ou nome da música seu burro");

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    try {
      registerPlayerPanel(message.guild.id, message.channel);
      await distube.play(voiceChannel, query, {
        textChannel: message.channel,
        member: message.member ?? undefined,
      });
    } catch (error) {
      console.error("Erro no $play:", error);
      const reason = summarizePlayError(error);
      return message.reply(`Deu ruim pra processar essa música 😢 (${reason})`);
    }
  },
};

export const skipCommand: Command = {
  names: ["$skip"],
  requiresVoice: true,
  async run({ message }) {
    const q = distube.getQueue(message.guild.id);
    if (!q) return message.reply("Não tem nada tocando.");
    try {
      await distube.skip(message.guild.id);
      message.reply("⏭️ Pulando...");
    } catch {
      await distube.stop(message.guild.id).catch(() => {});
      message.reply("⏭️ Era a última, encerrei a fila.");
    }
  },
};

export const stopCommand: Command = {
  names: ["$stop"],
  async run({ message }) {
    const q = distube.getQueue(message.guild.id);
    if (!q) return message.reply("Não tem nada tocando.");
    await distube.stop(message.guild.id).catch(() => {});
    message.reply("⏹️ Sou calvo, parando de tocar");
  },
};

export const leaveCommand: Command = {
  names: ["$leave"],
  async run({ message }) {
    const q = distube.getQueue(message.guild.id);
    if (q) await distube.stop(message.guild.id).catch(() => {});
    distube.voices.leave(message.guild.id);
    const panel = getPlayerPanel(message.guild.id);
    await disablePlayerPanel(panel);
    deletePlayerPanel(message.guild.id);
    message.reply("👋Sou calvo, saindo");
  },
};

export const nowCommand: Command = {
  names: ["$now"],
  async run({ message }) {
    const q = distube.getQueue(message.guild.id);
    if (!q || !q.songs.length) {
      return message.reply("Agora não tem nada tocando 😴");
    }

    const currentSong = q.songs[0]!;
    return message.reply(
      `🎵 Tocando agora: ${currentSong.name || currentSong.url} (${currentSong.source || "desconhecida"})`,
    );
  },
};

export const queueCommand: Command = {
  names: ["$queue"],
  async run({ message }) {
    const q = distube.getQueue(message.guild.id);
    if (!q || !q.songs.length) {
      return message.reply("Fila vazia no momento 🫗");
    }

    const currentSong = q.songs[0]!;
    const nextSongs = q.songs.slice(1, 11);

    const lines = [
      `🎵 **Agora:** ${currentSong.name || currentSong.url}`,
      `📦 **Na fila:** ${q.songs.length - 1}`,
    ];

    if (nextSongs.length) {
      lines.push("\n**Próximas:**");
      nextSongs.forEach((song, index) => {
        lines.push(`${index + 1}. ${song.name || song.url}`);
      });
    }

    if (q.songs.length > 11) {
      lines.push(`... e mais ${q.songs.length - 11} música(s)`);
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

    try {
      const torugoQuery = pickTorugoQuery();
      const hadQueue = Boolean(distube.getQueue(message.guild.id));

      await distube.play(voiceChannel, torugoQuery, {
        textChannel: message.channel,
        member: message.member ?? undefined,
      });

      if (hadQueue) {
        const q = distube.getQueue(message.guild.id);
        if (q && q.songs.length > 1) {
          const torugoSong = q.songs.pop()!;
          q.songs.splice(1, 0, torugoSong);
          await distube.skip(message.guild.id).catch(() => {});
        }
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
