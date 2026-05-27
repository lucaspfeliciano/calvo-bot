import { Shoukaku, Connectors, LoadType, type Node } from "shoukaku";
import type { LavalinkResponse, Track } from "shoukaku";

import { client } from "./client";
import { env } from "./config";

export const shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  [
    {
      name: "main",
      url: env.lavalinkUrl!,
      auth: env.lavalinkAuth,
      secure: env.lavalinkSecure,
    },
  ],
  {
    moveOnDisconnect: false,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 5,
    reconnectInterval: 5,
  },
);

shoukaku
  .on("ready", (name, resumed) =>
    console.log(
      `🎶 Lavalink node "${name}" pronto${resumed ? " (sessão retomada)" : ""}`,
    ),
  )
  .on("error", (name, error) =>
    console.error(`Lavalink node "${name}" error:`, error),
  )
  .on("close", (name, code, reason) =>
    console.warn(`Lavalink node "${name}" fechado (${code}): ${reason}`),
  )
  .on("disconnect", (name, count) =>
    console.warn(`Lavalink node "${name}" desconectado (count=${count})`),
  )
  .on("reconnecting", (name, left, interval) =>
    console.warn(
      `Lavalink node "${name}" reconectando (${left} tentativas restantes, ${interval}ms)`,
    ),
  );

export function getNode(): Node | undefined {
  return shoukaku.getIdealNode();
}

export type ResolveResult =
  | { kind: "track"; track: Track }
  | { kind: "playlist"; name: string; tracks: Track[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * Remove params problemáticos de URLs do YouTube. Mantém só `v` e `t`/`start`.
 * Isso evita que URLs como ?v=X&list=RD...&start_radio=1 sejam interpretadas como playlist
 * dinâmica (radio mix) — que costuma retornar vazio sem sessão ativa.
 */
function normalizeYouTubeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isYouTube = host.endsWith("youtube.com") || host === "youtu.be";
    if (!isYouTube) return url;

    const allowed = new Set(["v", "t", "start"]);
    for (const key of [...u.searchParams.keys()]) {
      if (!allowed.has(key)) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Resolve uma query (URL ou texto) via Lavalink. Texto puro é tratado como busca no YouTube.
 */
export async function resolveQuery(query: string): Promise<ResolveResult> {
  const node = getNode();
  if (!node) return { kind: "error", message: "Nenhum node Lavalink disponível" };

  const isUrl = /^https?:\/\//i.test(query);
  const cleanedQuery = isUrl ? normalizeYouTubeUrl(query) : query;
  const identifier = isUrl ? cleanedQuery : `ytsearch:${query}`;

  console.log(`[lavalink] resolve identifier="${identifier}"`);
  const response: LavalinkResponse | undefined = await node.rest.resolve(
    identifier,
  );
  if (!response) {
    console.log(`[lavalink] resolve → undefined`);
    return { kind: "empty" };
  }

  console.log(
    `[lavalink] resolve → loadType=${response.loadType}` +
      (response.loadType === LoadType.PLAYLIST
        ? ` tracks=${response.data.tracks.length}`
        : response.loadType === LoadType.SEARCH
          ? ` results=${response.data.length}`
          : response.loadType === LoadType.ERROR
            ? ` error="${response.data.message}"`
            : ""),
  );

  switch (response.loadType) {
    case LoadType.TRACK:
      return { kind: "track", track: response.data };
    case LoadType.PLAYLIST:
      if (!response.data.tracks.length) return { kind: "empty" };
      return {
        kind: "playlist",
        name: response.data.info.name,
        tracks: response.data.tracks,
      };
    case LoadType.SEARCH:
      if (!response.data.length) return { kind: "empty" };
      return { kind: "track", track: response.data[0]! };
    case LoadType.EMPTY:
      return { kind: "empty" };
    case LoadType.ERROR:
      return {
        kind: "error",
        message: response.data.message || "erro do Lavalink",
      };
  }
}
