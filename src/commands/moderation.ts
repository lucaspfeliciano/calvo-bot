import { muteJeff, theKiller, unmuteJeff } from "../features/moderation";
import type { Command } from "../types";

export const jeffMuteCommand: Command = {
  names: ["$jeff", "$calvo"],
  async run({ message }) {
    const trigger = message.content.split(" ")[0]!;
    const muted = await muteJeff(message.guild, `Comando ${trigger} executado`);
    if (muted) {
      return message.reply(
        "🔇 Jeff mutado com sucesso. Menos 30 minutos de palestra.",
      );
    }
    return message.reply("Jeff não está em canal de voz agora pra mutar.");
  },
};

export const jeffUnmuteCommand: Command = {
  names: ["$pjl", "$desmutajeff"],
  async run({ message }) {
    const trigger = message.content.split(" ")[0]!;
    const unmuted = await unmuteJeff(
      message.guild,
      `Comando ${trigger} executado`,
    );
    if (unmuted) {
      return message.reply("🔊 Jeff liberado. Voltou a falar no servidor.");
    }
    return message.reply(
      "Não consegui liberar o Jeff agora (talvez ele não esteja em call).",
    );
  },
};

export const theKillerCommand: Command = {
  names: ["$thekiller"],
  async run({ message }) {
    const result = await theKiller(message);
    return message.reply(result);
  },
};

export const casluCommand: Command = {
  names: ["$caslu"],
  run: ({ message }) => message.reply("Chega dessa merda de comando"),
};

export const moderationCommands: Command[] = [
  jeffMuteCommand,
  jeffUnmuteCommand,
  theKillerCommand,
  casluCommand,
];
