import { SoundCloudPlugin } from "@distube/soundcloud";
import type { Song } from "distube";

/**
 * SoundCloudPlugin que força a transcodificação **progressive** (MP3 direto, sem DRM).
 *
 * Por quê: o SoundCloud passou a servir HLS criptografado (esquema `cbcs`) como a
 * transcodificação de maior qualidade. O @distube/soundcloud pega a primeira (a hq),
 * então acabava escolhendo o stream cifrado — o ffmpeg recebia bytes criptografados e
 * jogava lixo no decoder AAC ("Invalid data found", "channel element not allocated").
 * O stream progressive é MP3 puro e toca normalmente.
 */
export class SoundCloudProgressivePlugin extends SoundCloudPlugin {
  override async getStreamURL(song: Song): Promise<string> {
    const url = song.url;
    if (!url) {
      throw new Error("Música do SoundCloud sem URL.");
    }

    const progressive = await this.soundcloud.util
      .streamLink(url, "progressive")
      .catch(() => undefined);
    if (progressive) return progressive;

    // Sem progressive: tenta HLS (pode ser opus/mp3 não-criptografado em algumas faixas).
    const hls = await this.soundcloud.util
      .streamLink(url, "hls")
      .catch(() => undefined);
    if (hls) return hls;

    throw new Error(
      "Essa faixa do SoundCloud não tem stream tocável (provavelmente protegida/DRM).",
    );
  }
}
