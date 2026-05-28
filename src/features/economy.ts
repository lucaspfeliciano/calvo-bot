import type { PoolClient } from "pg";

import {
  DAILY_AMOUNT,
  DAILY_COOLDOWN_MS,
  STARTING_BALANCE,
} from "../config";
import { requirePool } from "../db";

type Queryable = Pick<PoolClient, "query">;

/** Cria a carteira do usuário com saldo inicial, se ainda não existir. */
export async function ensureWallet(
  userId: string,
  db: Queryable = requirePool(),
): Promise<void> {
  await db.query(
    `INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, STARTING_BALANCE],
  );
}

export async function getBalance(userId: string): Promise<number> {
  await ensureWallet(userId);
  const { rows } = await requirePool().query<{ balance: string }>(
    `SELECT balance FROM wallets WHERE user_id = $1`,
    [userId],
  );
  return Number(rows[0]?.balance ?? 0);
}

/** Credita moedas (usado em payout, daily, refund). Aceita um client de transação. */
export async function addCoins(
  userId: string,
  amount: number,
  db: Queryable = requirePool(),
): Promise<void> {
  await ensureWallet(userId, db);
  await db.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [
    amount,
    userId,
  ]);
}

/**
 * Tenta debitar de forma atômica: só desconta se o saldo for suficiente.
 * Retorna true se debitou, false se saldo insuficiente.
 */
export async function tryDeduct(
  userId: string,
  amount: number,
  db: Queryable = requirePool(),
): Promise<boolean> {
  await ensureWallet(userId, db);
  const result = await db.query(
    `UPDATE wallets SET balance = balance - $1
     WHERE user_id = $2 AND balance >= $1`,
    [amount, userId],
  );
  return result.rowCount === 1;
}

export type DailyResult =
  | { ok: true; amount: number; balance: number }
  | { ok: false; nextInMs: number };

/** Concede o daily se o cooldown já passou. */
export async function claimDaily(userId: string): Promise<DailyResult> {
  await ensureWallet(userId);
  const { rows } = await requirePool().query<{
    last_daily: Date | null;
  }>(`SELECT last_daily FROM wallets WHERE user_id = $1`, [userId]);

  const last = rows[0]?.last_daily ? new Date(rows[0].last_daily) : null;
  const now = Date.now();
  if (last) {
    const elapsed = now - last.getTime();
    if (elapsed < DAILY_COOLDOWN_MS) {
      return { ok: false, nextInMs: DAILY_COOLDOWN_MS - elapsed };
    }
  }

  const { rows: updated } = await requirePool().query<{ balance: string }>(
    `UPDATE wallets SET balance = balance + $1, last_daily = now()
     WHERE user_id = $2 RETURNING balance`,
    [DAILY_AMOUNT, userId],
  );
  return {
    ok: true,
    amount: DAILY_AMOUNT,
    balance: Number(updated[0]!.balance),
  };
}

export type RankingEntry = { userId: string; balance: number };

export async function getTopBalances(limit = 10): Promise<RankingEntry[]> {
  const { rows } = await requirePool().query<{
    user_id: string;
    balance: string;
  }>(`SELECT user_id, balance FROM wallets ORDER BY balance DESC LIMIT $1`, [
    limit,
  ]);
  return rows.map((r) => ({ userId: r.user_id, balance: Number(r.balance) }));
}
