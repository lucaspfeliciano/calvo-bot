import { PermissionFlagsBits } from "discord.js";

import { COIN_EMOJI, COIN_NAME, isBettingEnabled } from "../config";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  cancelBet,
  closeBet,
  createBet,
  getBetView,
  listOpenBets,
  optionEmoji,
  placeWager,
  refreshBetMessage,
  renderBet,
  resolveBet,
  setBetMessage,
  type BetView,
} from "../features/betting";
import type { Command, CommandContext } from "../types";

const DISABLED_MSG =
  "💸 O sistema de apostas não está configurado (falta DATABASE_URL).";

function canManage(message: CommandContext["message"], bet: BetView): boolean {
  if (bet.creatorId === message.author.id) return true;
  return Boolean(
    message.member?.permissions.has(PermissionFlagsBits.ManageGuild),
  );
}

/** Resolve uma opção a partir do número 1-based que o usuário digita/vê. */
function optionByNumber(bet: BetView, num: number) {
  return bet.options.find((o) => o.position === num - 1);
}

async function handleCreate(
  ctx: CommandContext,
  rest: string,
): Promise<unknown> {
  const { message } = ctx;
  const parts = rest
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length < 1 + MIN_OPTIONS) {
    return message.reply(
      `Formato: \`$bet criar <pergunta> | opção1 | opção2\` (de ${MIN_OPTIONS} a ${MAX_OPTIONS} opções).`,
    );
  }

  const [description, ...optionLabels] = parts;
  if (optionLabels.length > MAX_OPTIONS) {
    return message.reply(`Máximo de ${MAX_OPTIONS} opções.`);
  }

  const view = await createBet(
    message.guild.id,
    message.channel.id,
    message.author.id,
    description!,
    optionLabels,
  );

  const sent = await message.channel.send(renderBet(view));
  await setBetMessage(view.id, sent.id);
  view.messageId = sent.id;

  return message.reply(
    `✅ Aposta **#${view.id}** criada! Galera, cliquem nos botões ou usem ` +
      `\`$apostar ${view.id} <nº> <quantia>\` pra entrar.`,
  );
}

async function handleClose(
  ctx: CommandContext,
  idRaw: string,
): Promise<unknown> {
  const { message } = ctx;
  const id = Number(idRaw);
  const bet = await getBetView(id);
  if (!bet) return message.reply("Aposta não encontrada.");
  if (!canManage(message, bet)) {
    return message.reply("Só quem criou a aposta (ou um admin) pode fechá-la.");
  }
  if (bet.status !== "open") {
    return message.reply("Essa aposta não está aberta.");
  }

  const updated = await closeBet(id);
  if (updated) await refreshBetMessage(message.client, updated);
  return message.reply(
    `🔒 Aposta **#${id}** fechada. Ninguém mais pode apostar. Use \`$bet resolver ${id} <nº>\` quando souber o resultado.`,
  );
}

async function handleResolve(
  ctx: CommandContext,
  idRaw: string,
  optionRaw: string,
): Promise<unknown> {
  const { message } = ctx;
  const id = Number(idRaw);
  const optionNum = Number(optionRaw);

  const bet = await getBetView(id);
  if (!bet) return message.reply("Aposta não encontrada.");
  if (!canManage(message, bet)) {
    return message.reply(
      "Só quem criou a aposta (ou um admin) pode resolvê-la.",
    );
  }

  const option = optionByNumber(bet, optionNum);
  if (!option) {
    return message.reply(
      `Opção inválida. Use o número da opção (1 a ${bet.options.length}).`,
    );
  }

  const result = await resolveBet(id, option.id);
  if (result.kind === "not_found")
    return message.reply("Aposta não encontrada.");
  if (result.kind === "already_done")
    return message.reply("Essa aposta já foi resolvida ou cancelada.");
  if (result.kind === "invalid_option")
    return message.reply("Opção inválida.");

  await refreshBetMessage(message.client, result.view);

  const header = `🏆 Aposta **#${id}** resolvida! Vencedor: ${optionEmoji(option.position)} **${option.label}**`;

  if (result.refunded) {
    return message.reply(
      `${header}\n⚠️ Ninguém acertou — todas as apostas foram devolvidas.`,
    );
  }
  if (!result.payouts.length) {
    return message.reply(`${header}\nNinguém tinha apostado.`);
  }

  const lines = await Promise.all(
    result.payouts
      .sort((a, b) => b.payout - a.payout)
      .map(async (p) => {
        const user = await message.client.users
          .fetch(p.userId)
          .catch(() => null);
        const name = user?.username ?? p.userId;
        const profit = p.payout - p.staked;
        const sign = profit >= 0 ? "+" : "";
        return `• ${name}: **${p.payout}** ${COIN_EMOJI} (${sign}${profit})`;
      }),
  );

  return message.reply([header, "💰 Pagamentos:", ...lines].join("\n"));
}

async function handleCancel(
  ctx: CommandContext,
  idRaw: string,
): Promise<unknown> {
  const { message } = ctx;
  const id = Number(idRaw);
  const bet = await getBetView(id);
  if (!bet) return message.reply("Aposta não encontrada.");
  if (!canManage(message, bet)) {
    return message.reply(
      "Só quem criou a aposta (ou um admin) pode cancelá-la.",
    );
  }

  const result = await cancelBet(id);
  if (result.kind === "not_found")
    return message.reply("Aposta não encontrada.");
  if (result.kind === "already_done")
    return message.reply("Essa aposta já foi resolvida ou cancelada.");

  await refreshBetMessage(message.client, result.view);
  return message.reply(
    `❌ Aposta **#${id}** cancelada. ${result.refunds.length} aposta(s) devolvida(s).`,
  );
}

export const betCommand: Command = {
  names: ["$bet", "$aposta"],
  async run(ctx) {
    const { message, args } = ctx;
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const sub = (args[0] ?? "").toLowerCase();
    const rest = args.slice(1).join(" ");

    if (sub === "criar" || sub === "create" || sub === "nova") {
      return handleCreate(ctx, rest);
    }
    if (sub === "fechar" || sub === "close") {
      return handleClose(ctx, args[1] ?? "");
    }
    if (sub === "resolver" || sub === "resolve") {
      return handleResolve(ctx, args[1] ?? "", args[2] ?? "");
    }
    if (sub === "cancelar" || sub === "cancel") {
      return handleCancel(ctx, args[1] ?? "");
    }

    return message.reply(
      [
        "🎲 **Comandos de aposta:**",
        "`$bet criar <pergunta> | opção1 | opção2` — abre uma aposta",
        "`$apostar <id> <nº> <quantia>` — aposta moedas",
        "`$bet fechar <id>` — para de aceitar apostas",
        "`$bet resolver <id> <nº>` — define o vencedor e paga",
        "`$bet cancelar <id>` — devolve tudo",
        "`$bets` — lista apostas abertas",
      ].join("\n"),
    );
  },
};

export const apostarCommand: Command = {
  names: ["$apostar"],
  async run({ message, args }) {
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const id = Number(args[0]);
    const optionNum = Number(args[1]);
    const amount = Number(args[2]);

    if (!id || !optionNum || !amount) {
      return message.reply("Formato: `$apostar <id> <nº da opção> <quantia>`");
    }

    const bet = await getBetView(id);
    if (!bet) return message.reply("Aposta não encontrada.");
    const option = optionByNumber(bet, optionNum);
    if (!option) {
      return message.reply(
        `Opção inválida. Use 1 a ${bet.options.length}.`,
      );
    }

    const result = await placeWager(id, message.author.id, option.id, amount);
    switch (result.kind) {
      case "not_found":
        return message.reply("Aposta não encontrada.");
      case "not_open":
        return message.reply("Essa aposta não está mais aceitando apostas.");
      case "invalid_option":
        return message.reply("Opção inválida.");
      case "bad_amount":
        return message.reply("Quantia inválida (tem que ser um número ≥ 1).");
      case "insufficient":
        return message.reply(
          `Saldo insuficiente. Vê seu \`$saldo\` ou pega o \`$daily\`.`,
        );
      case "ok":
        await refreshBetMessage(message.client, result.view);
        return message.reply(
          `✅ Apostou **${amount}** ${COIN_EMOJI} em ${optionEmoji(option.position)} **${option.label}** (aposta #${id}).`,
        );
    }
  },
};

export const betsCommand: Command = {
  names: ["$bets", "$apostas"],
  async run({ message }) {
    if (!isBettingEnabled()) return message.reply(DISABLED_MSG);

    const open = await listOpenBets(message.guild.id);
    if (!open.length) return message.reply("Nenhuma aposta aberta no momento.");

    const lines = open.map((b) => {
      const status = b.status === "open" ? "🟢" : "🔒";
      return `${status} **#${b.id}** — ${b.description} (${b.total} ${COIN_EMOJI} no bolão)`;
    });
    return message.reply(
      [`🎲 **Apostas ativas** (${COIN_NAME}):`, ...lines].join("\n"),
    );
  },
};

export const bettingCommands: Command[] = [
  betCommand,
  apostarCommand,
  betsCommand,
];
