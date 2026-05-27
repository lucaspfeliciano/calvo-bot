import { spawn } from "child_process";
import path from "path";
import {
  ExtractorPlugin,
  Playlist,
  Song,
  type ResolveOptions,
} from "distube";

const YTDLP_FLAGS = [
  "--dump-single-json",
  "--no-warnings",
  "--prefer-free-formats",
  "--skip-download",
  "--simulate",
];

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

function getYtDlpPath(): string {
  // Resolve via entry point porque o pacote tem `exports` que bloqueia acessar package.json direto.
  const entry = require.resolve("@distube/yt-dlp"); // → .../@distube/yt-dlp/dist/index.js
  const pluginDir = path.dirname(path.dirname(entry));
  const binName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(pluginDir, "bin", binName);
}

function parseJsonLoose(raw: string): unknown {
  // yt-dlp pode imprimir warnings/deprecations antes do JSON.
  // Localiza a primeira chave/colchete e parseia a partir dali.
  const trimmed = raw.trimStart();
  const start = trimmed.search(/[{[]/);
  if (start < 0)
    throw new Error(`yt-dlp não retornou JSON: ${trimmed.slice(0, 200)}`);
  return JSON.parse(trimmed.slice(start));
}

function runYtDlp(target: string, extraFlags: string[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), [target, ...YTDLP_FLAGS, ...extraFlags]);
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk) => (stdout += chunk));
    proc.stderr?.on("data", (chunk) => (stderr += chunk));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp saiu com código ${code}`));
        return;
      }
      try {
        resolve(parseJsonLoose(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}

interface YtDlpEntry {
  id?: string | number;
  title?: string;
  fulltitle?: string;
  webpage_url?: string;
  original_url?: string;
  extractor?: string;
  is_live?: boolean;
  duration?: number;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  uploader?: string;
  uploader_url?: string;
  view_count?: number;
  like_count?: number;
  age_limit?: number;
  url?: string;
}

interface YtDlpPlaylistInfo extends YtDlpEntry {
  entries: YtDlpEntry[];
}

function isPlaylist(info: unknown): info is YtDlpPlaylistInfo {
  return (
    typeof info === "object" &&
    info !== null &&
    Array.isArray((info as { entries?: unknown }).entries)
  );
}

function buildSong<T>(
  plugin: ExtractorPlugin,
  entry: YtDlpEntry,
  options: ResolveOptions<T>,
): Song<T> | null {
  const id = String(entry.id ?? "");
  const url =
    entry.webpage_url ||
    entry.original_url ||
    (id ? `https://www.youtube.com/watch?v=${id}` : undefined);
  if (!url) return null;

  const ageLimit = Number(entry.age_limit ?? 0);

  return new Song<T>(
    {
      plugin,
      source: entry.extractor || "youtube",
      playFromSource: true,
      id,
      name: entry.title || entry.fulltitle,
      url,
      isLive: Boolean(entry.is_live),
      thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url,
      duration: entry.is_live ? 0 : Number(entry.duration ?? 0),
      uploader: {
        name: entry.uploader,
        url: entry.uploader_url,
      },
      views: Number(entry.view_count ?? 0),
      likes: Number(entry.like_count ?? 0),
      ageRestricted: Boolean(ageLimit && ageLimit >= 18),
    },
    options,
  );
}

/**
 * ExtractorPlugin baseado no binário yt-dlp.
 *
 * Responsabilidades:
 * - Reivindica URLs do YouTube (resolve direto via yt-dlp)
 * - Implementa searchSong via `ytsearch1:` — usado como fallback do Spotify e pra queries de texto
 *
 * Por que não usar o YtDlpPlugin oficial: a função `json()` exportada por @distube/yt-dlp envia
 * `--no-call-home`, que foi deprecado em versões recentes do yt-dlp. A mensagem de deprecation vai
 * pro stdout antes do JSON e quebra o parse. Esta classe usa flags próprias e tolera prefixos.
 */
export class YtDlpSearchPlugin extends ExtractorPlugin {
  validate(url: string): boolean {
    return YOUTUBE_URL_RE.test(url);
  }

  async resolve<T>(
    url: string,
    options: ResolveOptions<T>,
  ): Promise<Song<T> | Playlist<T>> {
    const info = await runYtDlp(url);
    if (isPlaylist(info)) {
      if (info.entries.length === 0) throw new Error("Playlist vazia");
      const songs = info.entries
        .map((entry) => buildSong(this, entry, options))
        .filter((s): s is Song<T> => s !== null);
      if (songs.length === 0) throw new Error("Nenhuma música válida na playlist");
      return new Playlist<T>(
        {
          source: info.extractor || "youtube",
          songs,
          id: String(info.id ?? ""),
          name: info.title,
          url: info.webpage_url,
          thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
        },
        options,
      );
    }
    const song = buildSong(this, info as YtDlpEntry, options);
    if (!song) throw new Error("yt-dlp retornou info sem URL utilizável");
    return song;
  }

  getRelatedSongs(): Song[] {
    return [];
  }

  async getStreamURL<T>(song: Song<T>): Promise<string> {
    if (!song.url) throw new Error("Song sem URL");
    const info = await runYtDlp(song.url, ["--format", "ba/ba*"]);
    if (isPlaylist(info)) throw new Error("Stream URL veio como playlist");
    const url = (info as YtDlpEntry).url;
    if (!url) throw new Error("yt-dlp não retornou stream URL");
    return url;
  }

  async searchSong<T>(
    query: string,
    options: ResolveOptions<T>,
  ): Promise<Song<T> | null> {
    try {
      const info = await runYtDlp(`ytsearch1:${query}`);
      const entry = isPlaylist(info)
        ? info.entries[0]
        : (info as YtDlpEntry);
      if (!entry) return null;
      return buildSong(this, entry, options);
    } catch (error) {
      console.error(
        `[YtDlpSearchPlugin] busca falhou para "${query}":`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}
