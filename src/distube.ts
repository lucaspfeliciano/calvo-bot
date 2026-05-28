import { DisTube, type DisTubePlugin } from "distube";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { SpotifyPlugin } from "@distube/spotify";

import { client } from "./client";
import { env } from "./config";

// Apenas SoundCloud + Spotify. YouTube foi removido por bloqueio anti-bot em IPs de cloud.
// - SoundCloudPlugin: claim de URLs do SoundCloud + searchSong (busca por texto cai aqui).
// - SpotifyPlugin: InfoExtractor — resolve links do Spotify e espelha pro SoundCloud pra tocar.
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

export const distube = new DisTube(client, {
  emitNewSongOnly: false,
  savePreviousSongs: false,
  nsfw: true,
  plugins,
});
