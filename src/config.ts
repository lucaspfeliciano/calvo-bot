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

export const env = {
  token: process.env.TOKEN,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  lavalinkUrl: process.env.LAVALINK_URL, // ex: "lavalink-xyz.onrender.com:443"
  lavalinkAuth: process.env.LAVALINK_PASSWORD || "youshallnotpass",
  lavalinkSecure: process.env.LAVALINK_SECURE === "true",
};

export function assertEnv(): void {
  if (!env.token) {
    throw new Error("TOKEN env var não configurada.");
  }
  if (!env.lavalinkUrl) {
    throw new Error(
      "LAVALINK_URL env var não configurada (formato host:port, sem schema).",
    );
  }
}
