import { COIN_EMOJI, COIN_NAME, isBettingEnabled } from "../config";
import { claimDaily, getBalance, getTopBalances } from "../features/economy";
import type { Command } from "../types";

const DISABLED_MSG =
  "💸 O sistema de economia não está configurado (falta DATABASE_URL).";

function formatDuration(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export const saldoCommand: Command = {
  names: ["$saldo", "$balance"],
  async run({ message }) {
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const target = message.mentions.users.first() ?? message.author;
    const balance = await getBalance(target.id);
    const who =
      target.id === message.author.id ? "Você tem" : `${target.username} tem`;
    return message.reply(`${who} **${balance}** ${COIN_EMOJI} ${COIN_NAME}.`);
  },
};

export const dailyCommand: Command = {
  names: ["$daily"],
  async run({ message }) {
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const result = await claimDaily(message.author.id);
    if (!result.ok) {
      return message.reply(
        `⏳ Você já pegou seu daily. Volta em **${formatDuration(result.nextInMs)}**.`,
      );
    }
    return message.reply(
      `${COIN_EMOJI} +${result.amount} ${COIN_NAME}! Saldo: **${result.balance}**.`,
    );
  },
};

export const rankingCommand: Command = {
  names: ["$ranking", "$rank", "$top"],
  async run({ message }) {
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const top = await getTopBalances(10);
    if (!top.length) return message.reply("Ninguém tem moedas ainda 🤷");

    const medals = ["🥇", "🥈", "🥉"];
    const lines = await Promise.all(
      top.map(async (entry, i) => {
        const prefix = medals[i] ?? `**${i + 1}.**`;
        const user = await message.client.users
          .fetch(entry.userId)
          .catch(() => null);
        const name = user?.username ?? entry.userId;
        return `${prefix} ${name} — ${entry.balance} ${COIN_EMOJI}`;
      }),
    );

    return message.reply(
      [`🏆 **Ranking de ${COIN_NAME}**`, ...lines].join("\n"),
    );
  },
};

export const economyCommands: Command[] = [
  saldoCommand,
  dailyCommand,
  rankingCommand,
];
