import { DisTube, type DisTubePlugin } from "distube";
import { SpotifyPlugin } from "@distube/spotify";

import { client } from "./client";
import { env } from "./config";
import { SoundCloudProgressivePlugin } from "./features/soundcloud-progressive";

// Apenas SoundCloud + Spotify. YouTube foi removido por bloqueio anti-bot em IPs de cloud.
// - SoundCloudProgressivePlugin: claim de URLs do SoundCloud + searchSong; força stream MP3
//   progressive (o HLS do SoundCloud virou cbcs criptografado e quebra no ffmpeg).
// - SpotifyPlugin: InfoExtractor — resolve links do Spotify e espelha pro SoundCloud pra tocar.
const plugins: DisTubePlugin[] = [new SoundCloudProgressivePlugin()];

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
