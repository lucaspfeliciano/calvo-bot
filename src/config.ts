import fs from "fs";
import path from "path";

import type ytdl from "@distube/ytdl-core";

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
  youtubeCookies: process.env.YOUTUBE_COOKIES,
};

export function assertEnv(): void {
  if (!env.token) {
    throw new Error("TOKEN env var não configurada.");
  }
}

export function loadYoutubeCookies(): ytdl.Cookie[] | undefined {
  const raw = env.youtubeCookies ?? readCookiesFile();
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("⚠️ youtube-cookies inválido: precisa ser um array JSON.");
      return undefined;
    }
    return parsed as ytdl.Cookie[];
  } catch (error) {
    console.warn("⚠️ Falha ao parsear youtube-cookies:", error);
    return undefined;
  }
}

function readCookiesFile(): string | undefined {
  const filePath = path.join(process.cwd(), "youtube-cookies.json");
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, "utf8");
}
