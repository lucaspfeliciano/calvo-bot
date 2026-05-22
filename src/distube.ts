import { DisTube, type DisTubePlugin } from "distube";
import { YouTubePlugin } from "@distube/youtube";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";

import { client } from "./client";
import { env, loadYoutubeCookies } from "./config";

const youtubeCookies = loadYoutubeCookies();
if (youtubeCookies) {
  console.log(`🍪 YouTube cookies carregados (${youtubeCookies.length} entries).`);
} else {
  console.warn(
    "⚠️ Sem cookies de YouTube — links do YouTube podem cair em bloqueio anti-bot.",
  );
}

const plugins: DisTubePlugin[] = [
  new YouTubePlugin({ cookies: youtubeCookies }),
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

export const distube = new DisTube(client, {
  emitNewSongOnly: false,
  savePreviousSongs: false,
  nsfw: true,
  plugins,
});
