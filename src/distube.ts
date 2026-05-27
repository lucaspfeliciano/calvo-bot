import { DisTube, type DisTubePlugin } from "distube";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";
import { download as downloadYtDlpBinary } from "@distube/yt-dlp";

import { client } from "./client";
import { env } from "./config";
import { setupYtDlpCookies } from "./features/yt-dlp-cookies";
import { YtDlpSearchPlugin } from "./features/yt-dlp-search";

// Mantemos o binário do yt-dlp atualizado mesmo sem o YtDlpPlugin oficial.
downloadYtDlpBinary().catch((error) => {
  console.warn(
    "⚠️ Falha ao atualizar yt-dlp binário:",
    error instanceof Error ? error.message : error,
  );
});

// Ordem importa:
// - YtDlpSearchPlugin: reivindica URLs do YouTube + implementa searchSong (fallback do Spotify e
//   pra queries de texto). Substitui o YtDlpPlugin oficial, que está quebrado em versões recentes
//   do yt-dlp por causa da flag deprecada --no-call-home.
// - SoundCloudPlugin: claim de URLs do SoundCloud + searchSong como fallback secundário.
// - SpotifyPlugin: extrai metadata; busca real é delegada ao primeiro ExtractorPlugin (YtDlpSearchPlugin).
const plugins: DisTubePlugin[] = [
  new YtDlpSearchPlugin(),
  new SoundCloudPlugin(),
];

if (env.spotifyClientId && env.spotifyClientSecret) {
  plugins.push(
    new SpotifyPlugin({
      api: {
        clientId: env.spotifyClientId,
        clientSecret: env.spotifyClientSecret,
      },
    }),
  );
} else {
  console.warn(
    "⚠️ SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET não configurados — links do Spotify não vão funcionar.",
  );
}

const cookiesPath = setupYtDlpCookies();
if (cookiesPath) {
  console.log(`🍪 yt-dlp cookies configurados (${cookiesPath})`);
} else {
  console.warn(
    "⚠️ Sem cookies pro yt-dlp — YouTube provavelmente vai falhar em IPs de cloud.",
  );
}

export const distube = new DisTube(client, {
  emitNewSongOnly: false,
  savePreviousSongs: false,
  nsfw: true,
  plugins,
});
