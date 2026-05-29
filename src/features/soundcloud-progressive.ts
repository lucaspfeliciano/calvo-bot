import { SoundCloudPlugin } from "@distube/soundcloud";
import type { ResolveOptions, Song } from "distube";

interface Transcoding {
  url?: string;
  preset?: string;
  format?: { protocol?: string };
}

interface ScTrack {
  permalink_url?: string;
  policy?: string; // "ALLOW" = faixa completa | "SNIP" = preview de 30s
  duration?: number; // ms disponível pra tocar
  full_duration?: number; // ms reais da faixa
  title?: string;
  media?: { transcodings?: Transcoding[] };
}

const MIN_NORMAL_SEC = 45;
const MAX_NORMAL_SEC = 12 * 60;
const SEARCH_LIMIT = 15;
const MAX_CANDIDATES = 6; // quantos candidatos validar antes de desistir

type ScApi = {
  getClientId: (force?: boolean) => Promise<string>;
  headers?: Record<string, string>;
};

/** Só transcodificações sem DRM: progressive (MP3 direto) ou hls puro. */
function cleanTranscodings(transcodings: Transcoding[]): Transcoding[] {
  return transcodings
    .filter(
      (t) =>
        t.format?.protocol === "progressive" || t.format?.protocol === "hls",
    )
    .sort((a, b) => (a.format?.protocol === "progressive" ? -1 : 1));
}

/**
 * Resolve a URL de stream real de uma faixa, tentando cada transcodificação limpa até uma
 * responder 200. Retorna null se nenhuma funcionar (faixa só-DRM ou transcodings fantasma).
 */
async function resolveCleanStream(
  transcodings: Transcoding[],
  api: ScApi,
): Promise<string | null> {
  const clean = cleanTranscodings(transcodings);
  if (!clean.length) return null;

  const clientId = await api.getClientId();
  for (const t of clean) {
    if (!t.url) continue;
    const sep = t.url.includes("?") ? "&" : "?";
    try {
      const res = await fetch(`${t.url}${sep}client_id=${clientId}`, {
        headers: api.headers ?? {},
      });
      if (!res.ok) continue;
      const payload = (await res.json()) as { url?: string };
      if (payload.url) return payload.url;
    } catch {
      // tenta a próxima transcodificação
    }
  }
  return null;
}

/** Quanto MENOR a pontuação, melhor o candidato. */
function trackScore(track: ScTrack, relevanceIndex: number): number {
  let score = relevanceIndex; // o SoundCloud já devolve por relevância

  const isFull =
    track.policy === "ALLOW" &&
    (!track.full_duration ||
      Math.abs((track.duration ?? 0) - track.full_duration) < 5000);
  if (!isFull) score += 1000; // preview/SNIP → fim da fila

  const durSec = (track.duration ?? 0) / 1000;
  if (durSec > MAX_NORMAL_SEC || durSec < MIN_NORMAL_SEC) score += 100; // mixes/clipes

  const hasClean = cleanTranscodings(track.media?.transcodings ?? []).length > 0;
  if (!hasClean) score += 5000; // só DRM

  return score;
}

/**
 * SoundCloudPlugin endurecido pra realmente TOCAR em servidor:
 *
 * 1. `searchSong` (busca por texto E espelhamento do Spotify) ordena os resultados preferindo
 *    faixa completa (`policy: ALLOW`) e duração de música normal, e então **valida** cada
 *    candidato resolvendo o stream — só retorna uma faixa que de fato toca. Isso evita tanto
 *    o preview de 30s quanto faixas com transcodings "fantasma" (listadas mas dão 404).
 *
 * 2. `getStreamURL` tenta todas as transcodificações sem DRM (progressive MP3 → hls limpo),
 *    ignorando as `*-encrypted-hls` (cbcs/ctr) que o ffmpeg não decodifica.
 */
export class SoundCloudProgressivePlugin extends SoundCloudPlugin {
  private get scApi(): ScApi {
    return this.soundcloud.api as unknown as ScApi;
  }

  // Assinatura espelha a do SoundCloudPlugin (Promise<Song<T>>); resolve pra null quando não
  // há faixa tocável — o DisTube trata com checagem truthy (igual o comportamento original).
  override async searchSong<T>(
    query: string,
    options: ResolveOptions<T>,
  ): Promise<Song<T>> {
    const empty = null as unknown as Song<T>;
    await this.scApi.getClientId().catch(() => {});

    const data = (await this.soundcloud.tracks
      .search({ q: query, limit: SEARCH_LIMIT })
      .catch(() => null)) as { collection?: ScTrack[] } | null;

    const tracks = data?.collection ?? [];
    if (!tracks.length) return empty;

    const ranked = tracks
      .map((track, index) => ({ track, score: trackScore(track, index) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_CANDIDATES);

    // Valida candidatos em ordem: o primeiro que resolve um stream tocável vence.
    for (const { track } of ranked) {
      if (!track.permalink_url) continue;
      const stream = await resolveCleanStream(
        track.media?.transcodings ?? [],
        this.scApi,
      );
      if (!stream) continue;

      const resolved = await this.resolve(track.permalink_url, options);
      if ("url" in resolved) return resolved as Song<T>;
    }

    return empty;
  }

  override async getStreamURL(song: Song): Promise<string> {
    const trackUrl = song.url;
    if (!trackUrl) throw new Error("Música do SoundCloud sem URL.");

    const track = (await this.soundcloud.resolve.get(
      trackUrl,
      true,
    )) as ScTrack;
    const transcodings = track?.media?.transcodings ?? [];

    const stream = await resolveCleanStream(transcodings, this.scApi);
    if (stream) return stream;

    const list = transcodings
      .map((t) => `${t.format?.protocol ?? "?"}/${t.preset ?? "?"}`)
      .join(", ");
    console.warn(
      `[soundcloud] sem stream tocável p/ ${trackUrl} — transcodings: ${list || "nenhuma"}`,
    );
    throw new Error(
      "Essa faixa do SoundCloud não tem stream tocável (provavelmente protegida/DRM).",
    );
  }
}
