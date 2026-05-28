export const JEFF_USER_ID = "691022104812060704";
export const RAMON_LIST_CHANNEL_ID = "1233506971190038700";

export const TORUGO_URL =
  "https://www.youtube.com/watch?v=0692WFAqRxs&list=RD0692WFAqRxs&start_radio=1";

export const TORUGO_FALLBACK_QUERIES = [
  "filho do piseiro",
  "filho do piseiro junin",
  "hino do torugo",
];

export const POKER_REVEAL_DELAY_MS = 1600;
export const POKER_BURN_DELAY_MS = 1000;

export const MIX_TEAM_SIZE = 5;

// Economia / apostas (faucoins).
export const COIN_NAME = "faucoins";
export const COIN_EMOJI = "🪙";
export const STARTING_BALANCE = 1000;
export const DAILY_AMOUNT = 200;
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h (1 resgate por dia)

export const env = {
  token: process.env.TOKEN,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
};

export function assertEnv(): void {
  if (!env.token) {
    throw new Error("TOKEN env var não configurada.");
  }
}

export function isBettingEnabled(): boolean {
  return Boolean(env.databaseUrl);
}
