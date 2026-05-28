import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
} from "discord.js";

import { COIN_EMOJI } from "../config";
import { requirePool, withTransaction } from "../db";
import { addCoins, tryDeduct } from "./economy";

export const MIN_WAGER = 1;
export const MAX_OPTIONS = 5;
export const MIN_OPTIONS = 2;

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

export type BetStatus = "open" | "closed" | "resolved" | "cancelled";

export interface BetOptionView {
  id: number;
  label: string;
  position: number;
  pool: number;
}

export interface BetView {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  creatorId: string;
  description: string;
  status: BetStatus;
  winningOptionId: number | null;
  options: BetOptionView[];
  total: number;
}

export async function createBet(
  guildId: string,
  channelId: string,
  creatorId: string,
  description: string,
  optionLabels: string[],
): Promise<BetView> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO bets (guild_id, channel_id, creator_id, description)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [guildId, channelId, creatorId, description],
    );
    const betId = rows[0]!.id;

    for (let i = 0; i < optionLabels.length; i += 1) {
      await client.query(
        `INSERT INTO bet_options (bet_id, label, position) VALUES ($1, $2, $3)`,
        [betId, optionLabels[i], i],
      );
    }

    const view = await getBetViewWith(client, betId);
    if (!view) throw new Error("Falha ao criar aposta");
    return view;
  });
}

export async function setBetMessage(
  betId: number,
  messageId: string,
): Promise<void> {
  await requirePool().query(`UPDATE bets SET message_id = $1 WHERE id = $2`, [
    messageId,
    betId,
  ]);
}

async function getBetViewWith(
  db: Pick<import("pg").PoolClient, "query">,
  betId: number,
): Promise<BetView | null> {
  const betRes = await db.query<{
    id: number;
    guild_id: string;
    channel_id: string;
    message_id: string | null;
    creator_id: string;
    description: string;
    status: BetStatus;
    winning_option_id: number | null;
  }>(`SELECT * FROM bets WHERE id = $1`, [betId]);
  const bet = betRes.rows[0];
  if (!bet) return null;

  const optsRes = await db.query<{
    id: number;
    label: string;
    position: number;
    pool: string | null;
  }>(
    `SELECT o.id, o.label, o.position, COALESCE(SUM(w.amount), 0) AS pool
     FROM bet_options o
     LEFT JOIN wagers w ON w.option_id = o.id
     WHERE o.bet_id = $1
     GROUP BY o.id
     ORDER BY o.position`,
    [betId],
  );

  const options = optsRes.rows.map((o) => ({
    id: o.id,
    label: o.label,
    position: o.position,
    pool: Number(o.pool ?? 0),
  }));
  const total = options.reduce((sum, o) => sum + o.pool, 0);

  return {
    id: bet.id,
    guildId: bet.guild_id,
    channelId: bet.channel_id,
    messageId: bet.message_id,
    creatorId: bet.creator_id,
    description: bet.description,
    status: bet.status,
    winningOptionId: bet.winning_option_id,
    options,
    total,
  };
}

export async function getBetView(betId: number): Promise<BetView | null> {
  return getBetViewWith(requirePool(), betId);
}

export async function listOpenBets(guildId: string): Promise<BetView[]> {
  const { rows } = await requirePool().query<{ id: number }>(
    `SELECT id FROM bets WHERE guild_id = $1 AND status IN ('open', 'closed')
     ORDER BY id DESC LIMIT 15`,
    [guildId],
  );
  const views: BetView[] = [];
  for (const row of rows) {
    const v = await getBetView(row.id);
    if (v) views.push(v);
  }
  return views;
}

export type WagerResult =
  | { kind: "ok"; view: BetView }
  | { kind: "not_found" }
  | { kind: "not_open" }
  | { kind: "invalid_option" }
  | { kind: "bad_amount" }
  | { kind: "insufficient" };

export async function placeWager(
  betId: number,
  userId: string,
  optionId: number,
  amount: number,
): Promise<WagerResult> {
  if (!Number.isInteger(amount) || amount < MIN_WAGER) {
    return { kind: "bad_amount" };
  }

  return withTransaction(async (client) => {
    const betRes = await client.query<{ status: BetStatus }>(
      `SELECT status FROM bets WHERE id = $1 FOR UPDATE`,
      [betId],
    );
    const bet = betRes.rows[0];
    if (!bet) return { kind: "not_found" as const };
    if (bet.status !== "open") return { kind: "not_open" as const };

    const optRes = await client.query(
      `SELECT 1 FROM bet_options WHERE id = $1 AND bet_id = $2`,
      [optionId, betId],
    );
    if (optRes.rowCount === 0) return { kind: "invalid_option" as const };

    const deducted = await tryDeduct(userId, amount, client);
    if (!deducted) return { kind: "insufficient" as const };

    await client.query(
      `INSERT INTO wagers (bet_id, option_id, user_id, amount)
       VALUES ($1, $2, $3, $4)`,
      [betId, optionId, userId, amount],
    );

    const view = await getBetViewWith(client, betId);
    return { kind: "ok" as const, view: view! };
  });
}

export async function closeBet(betId: number): Promise<BetView | null> {
  await requirePool().query(
    `UPDATE bets SET status = 'closed' WHERE id = $1 AND status = 'open'`,
    [betId],
  );
  return getBetView(betId);
}

export type Payout = { userId: string; staked: number; payout: number };

export type ResolveResult =
  | { kind: "ok"; view: BetView; payouts: Payout[]; refunded: boolean }
  | { kind: "not_found" }
  | { kind: "already_done" }
  | { kind: "invalid_option" };

export async function resolveBet(
  betId: number,
  winningOptionId: number,
): Promise<ResolveResult> {
  return withTransaction(async (client) => {
    const betRes = await client.query<{ status: BetStatus }>(
      `SELECT status FROM bets WHERE id = $1 FOR UPDATE`,
      [betId],
    );
    const bet = betRes.rows[0];
    if (!bet) return { kind: "not_found" as const };
    if (bet.status === "resolved" || bet.status === "cancelled") {
      return { kind: "already_done" as const };
    }

    const optRes = await client.query(
      `SELECT 1 FROM bet_options WHERE id = $1 AND bet_id = $2`,
      [winningOptionId, betId],
    );
    if (optRes.rowCount === 0) return { kind: "invalid_option" as const };

    // Soma por usuário (no lado vencedor) e total geral.
    const totalRes = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM wagers WHERE bet_id = $1`,
      [betId],
    );
    const total = Number(totalRes.rows[0]!.total);

    const winnersRes = await client.query<{ user_id: string; staked: string }>(
      `SELECT user_id, SUM(amount) AS staked FROM wagers
       WHERE bet_id = $1 AND option_id = $2 GROUP BY user_id`,
      [betId, winningOptionId],
    );
    const winningPool = winnersRes.rows.reduce(
      (sum, r) => sum + Number(r.staked),
      0,
    );

    const payouts: Payout[] = [];
    let refunded = false;

    if (total === 0) {
      // Ninguém apostou — nada a pagar.
    } else if (winningPool === 0) {
      // Ninguém acertou — devolve tudo pra todo mundo.
      refunded = true;
      const allRes = await client.query<{ user_id: string; staked: string }>(
        `SELECT user_id, SUM(amount) AS staked FROM wagers
         WHERE bet_id = $1 GROUP BY user_id`,
        [betId],
      );
      for (const row of allRes.rows) {
        const staked = Number(row.staked);
        await addCoins(row.user_id, staked, client);
        payouts.push({ userId: row.user_id, staked, payout: staked });
      }
    } else {
      // Bolão: cada vencedor recebe staked * (total / winningPool).
      for (const row of winnersRes.rows) {
        const staked = Number(row.staked);
        const payout = Math.floor((staked * total) / winningPool);
        await addCoins(row.user_id, payout, client);
        payouts.push({ userId: row.user_id, staked, payout });
      }
    }

    await client.query(
      `UPDATE bets SET status = 'resolved', winning_option_id = $1, resolved_at = now()
       WHERE id = $2`,
      [winningOptionId, betId],
    );

    const view = await getBetViewWith(client, betId);
    return { kind: "ok" as const, view: view!, payouts, refunded };
  });
}

export type CancelResult =
  | { kind: "ok"; view: BetView; refunds: Payout[] }
  | { kind: "not_found" }
  | { kind: "already_done" };

export async function cancelBet(betId: number): Promise<CancelResult> {
  return withTransaction(async (client) => {
    const betRes = await client.query<{ status: BetStatus }>(
      `SELECT status FROM bets WHERE id = $1 FOR UPDATE`,
      [betId],
    );
    const bet = betRes.rows[0];
    if (!bet) return { kind: "not_found" as const };
    if (bet.status === "resolved" || bet.status === "cancelled") {
      return { kind: "already_done" as const };
    }

    const allRes = await client.query<{ user_id: string; staked: string }>(
      `SELECT user_id, SUM(amount) AS staked FROM wagers
       WHERE bet_id = $1 GROUP BY user_id`,
      [betId],
    );
    const refunds: Payout[] = [];
    for (const row of allRes.rows) {
      const staked = Number(row.staked);
      await addCoins(row.user_id, staked, client);
      refunds.push({ userId: row.user_id, staked, payout: staked });
    }

    await client.query(`UPDATE bets SET status = 'cancelled' WHERE id = $1`, [
      betId,
    ]);

    const view = await getBetViewWith(client, betId);
    return { kind: "ok" as const, view: view!, refunds };
  });
}

// ---------- Renderização ----------

const STATUS_LABEL: Record<BetStatus, string> = {
  open: "🟢 Aberta — pode apostar",
  closed: "🔒 Fechada — aguardando resultado",
  resolved: "✅ Resolvida",
  cancelled: "❌ Cancelada (apostas devolvidas)",
};

export function optionEmoji(position: number): string {
  return OPTION_EMOJIS[position] ?? "🔹";
}

export function buildBetEmbed(view: BetView): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎲 Aposta #${view.id}`)
    .setDescription(view.description)
    .setFooter({
      text: `Total no bolão: ${view.total} ${COIN_EMOJI} · ${STATUS_LABEL[view.status]}`,
    });

  if (view.status === "resolved") embed.setColor(0x00b894);
  else if (view.status === "cancelled") embed.setColor(0xd63031);
  else if (view.status === "closed") embed.setColor(0xfdcb6e);
  else embed.setColor(0x0984e3);

  for (const opt of view.options) {
    const isWinner =
      view.status === "resolved" && view.winningOptionId === opt.id;
    const share = view.total > 0 ? (opt.pool / view.total) * 100 : 0;
    const multiplier =
      opt.pool > 0 ? (view.total / opt.pool).toFixed(2) : "—";
    const name = `${optionEmoji(opt.position)} ${opt.label}${isWinner ? " 🏆" : ""}`;
    const value =
      `${opt.pool} ${COIN_EMOJI} (${share.toFixed(0)}%)` +
      (view.status === "open" || view.status === "closed"
        ? ` · paga ~${multiplier}x`
        : "");
    embed.addFields({ name, value, inline: true });
  }

  return embed;
}

export function buildBetButtons(
  view: BetView,
): ActionRowBuilder<ButtonBuilder>[] {
  if (view.status !== "open") return [];

  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const opt of view.options) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bet_wager_${view.id}_${opt.id}`)
        .setLabel(opt.label.slice(0, 80))
        .setEmoji(optionEmoji(opt.position))
        .setStyle(ButtonStyle.Primary),
    );
  }
  return [row];
}

export function renderBet(view: BetView): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  return { embeds: [buildBetEmbed(view)], components: buildBetButtons(view) };
}

/** Edita a mensagem-embed da aposta no canal (se ainda existir). */
export async function refreshBetMessage(
  client: Client,
  view: BetView,
): Promise<void> {
  if (!view.messageId) return;
  try {
    const channel = await client.channels.fetch(view.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) return;
    const msg = await channel.messages.fetch(view.messageId);
    await msg.edit(renderBet(view));
  } catch {
    // Mensagem apagada ou sem permissão — ignora.
  }
}
