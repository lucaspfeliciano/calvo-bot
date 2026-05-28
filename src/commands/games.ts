import { startNetinhoBet } from "../features/poker/netinho-bet";
import { runNetinhoPoker } from "../features/poker/runner";
import { startMixCommand } from "../features/mix";
import { startPicksCommand } from "../features/picks";
import { startCsLobbyCommand } from "../features/cs-lobby";
import type { Command } from "../types";

export const netinhoCommand: Command = {
  names: ["$netinho"],
  requiresVoice: true,
  async run({ message }) {
    runNetinhoPoker(message).catch((error) => {
      console.error("Erro no comando $netinho:", error);
      message.reply("Deu erro na mesa do Netinho 😢").catch(() => {});
    });
  },
};

export const netinhoBetCommand: Command = {
  names: ["$netinhobet"],
  requiresVoice: true,
  async run({ message }) {
    startNetinhoBet(message).catch((error) => {
      console.error("Erro no comando $netinhobet:", error);
      message.reply("Deu erro na mesa de apostas do Netinho 😢").catch(() => {});
    });
  },
};

export const mixCommand: Command = {
  names: ["$mix"],
  requiresVoice: true,
  run: ({ message }) => startMixCommand(message),
};

export const picksCommand: Command = {
  names: ["$picks"],
  requiresVoice: true,
  run: ({ message }) => startPicksCommand(message),
};

export const ramonCommand: Command = {
  names: ["$ramon"],
  requiresVoice: true,
  async run({ message }) {
    const result = await startCsLobbyCommand(message);
    return message.reply(result.message);
  },
};

export const gamesCommands: Command[] = [
  netinhoCommand,
  netinhoBetCommand,
  mixCommand,
  picksCommand,
  ramonCommand,
];
