import { Pool, type PoolClient } from "pg";

import { env } from "./config";

// Pool só é criado se DATABASE_URL existir. Sem ele, o módulo de apostas fica desativado
// e o resto do bot (música, games) continua funcionando normalmente.
export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      // Neon (e a maioria dos Postgres hospedados) exige SSL.
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  : null;

export function requirePool(): Pool {
  if (!pool) {
    throw new Error("Banco de dados não configurado (DATABASE_URL ausente).");
  }
  return pool;
}

/** Roda uma função dentro de uma transação, com rollback automático em erro. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function initDb(): Promise<void> {
  if (!pool) {
    console.warn(
      "⚠️ DATABASE_URL não configurada — sistema de apostas/economia desativado.",
    );
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      user_id     TEXT PRIMARY KEY,
      balance     BIGINT NOT NULL DEFAULT 0,
      last_daily  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bets (
      id                SERIAL PRIMARY KEY,
      guild_id          TEXT NOT NULL,
      channel_id        TEXT NOT NULL,
      message_id        TEXT,
      creator_id        TEXT NOT NULL,
      description       TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'open',
      kind              TEXT NOT NULL DEFAULT 'manual',
      winning_option_id INTEGER,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at       TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS bet_options (
      id        SERIAL PRIMARY KEY,
      bet_id    INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
      label     TEXT NOT NULL,
      position  INTEGER NOT NULL,
      player_id TEXT
    );

    CREATE TABLE IF NOT EXISTS wagers (
      id          SERIAL PRIMARY KEY,
      bet_id      INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
      option_id   INTEGER NOT NULL REFERENCES bet_options(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL,
      amount      BIGINT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Migrações idempotentes (caso as tabelas já existam de uma versão anterior).
    ALTER TABLE bets ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'manual';
    ALTER TABLE bet_options ADD COLUMN IF NOT EXISTS player_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_wagers_bet ON wagers(bet_id);
    CREATE INDEX IF NOT EXISTS idx_options_bet ON bet_options(bet_id);
  `);

  console.log("🗄️ Banco de dados pronto (economia/apostas ativas).");
}
