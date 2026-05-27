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
 * Resolve uma query (URL ou texto) via Lavalink. Texto puro é tratado como busca no YouTube.
 */
export async function resolveQuery(query: string): Promise<ResolveResult> {
  const node = getNode();
  if (!node) return { kind: "error", message: "Nenhum node Lavalink disponível" };

  const isUrl = /^https?:\/\//i.test(query);
  const identifier = isUrl ? query : `ytsearch:${query}`;

  const response: LavalinkResponse | undefined = await node.rest.resolve(
    identifier,
  );
  if (!response) return { kind: "empty" };

  switch (response.loadType) {
    case LoadType.TRACK:
      return { kind: "track", track: response.data };
    case LoadType.PLAYLIST:
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
