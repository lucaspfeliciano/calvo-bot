// Palavras-ruído que aparecem em títulos do YouTube e atrapalham a busca no SoundCloud.
const NOISE =
  /\b(official|video|audio|lyric|lyrics|clipe|oficial|hd|4k|remaster(ed)?|ao vivo|live|visualizer|mv|m\/v|color coded|legendado|tradu[cç][aã]o|music video|performance|explicit|prod\.?)\b/i;

/** Extrai a primeira URL do YouTube de um texto. */
export function extractYouTubeUrl(text: string): string | null {
  const m = text.match(
    /https?:\/\/[^\s]*(?:youtube\.com|youtu\.be)[^\s]*/i,
  );
  return m ? m[0] : null;
}

/** Limpa o título do vídeo pra virar uma boa query de busca ("Artista - Música"). */
function cleanTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, " ") // remove [colchetes] (quase sempre ruído)
    .replace(/\(([^)]*)\)/g, (full, inner: string) =>
      NOISE.test(inner) ? " " : full,
    ) // remove (parênteses) com ruído, mantém (feat...), (remix...)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, " ") // emojis
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pega o título de um vídeo do YouTube via oEmbed (endpoint público e leve, NÃO usa a InnerTube
 * API que bloqueia IPs de datacenter) e devolve uma query de busca pro SoundCloud.
 * Retorna null se o oEmbed falhar (vídeo privado, removido, ou bloqueio).
 */
export async function youtubeUrlToSearchQuery(
  url: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
    };
    if (!data.title) return null;

    const cleaned = cleanTitle(data.title);
    if (!cleaned) return null;

    // Se o título não tem separador artista-música, prefixa o canal pra dar contexto.
    const author = (data.author_name ?? "")
      .replace(/\b(vevo|- topic|official|oficial)\b/gi, "")
      .trim();
    if (!cleaned.includes(" - ") && author && !cleaned.toLowerCase().includes(author.toLowerCase())) {
      return `${author} ${cleaned}`.trim();
    }
    return cleaned;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
