import { DisTube, type DisTubePlugin } from "distube";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";
import { YtDlpPlugin } from "@distube/yt-dlp";

import { client } from "./client";
import { env } from "./config";
import { setupYtDlpCookies } from "./features/yt-dlp-cookies";

// Ordem importa:
// - SoundCloudPlugin primeiro: claim de URLs do SoundCloud + handler de busca por texto.
// - SpotifyPlugin: extrai metadata; busca real é delegada ao primeiro plugin com searchSong (SoundCloud).
// - YtDlpPlugin por último: claim de qualquer URL (YouTube e 900+ outros sites) via binário yt-dlp.
//   Mais resiliente que o YouTubePlugin contra bloqueio anti-bot em IPs de cloud.
const plugins: DisTubePlugin[] = [new SoundCloudPlugin()];

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

plugins.push(new YtDlpPlugin({ update: true }));

export const distube = new DisTube(client, {
  emitNewSongOnly: false,
  savePreviousSongs: false,
  nsfw: true,
  plugins,
});
