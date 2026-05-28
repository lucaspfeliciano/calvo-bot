import { Events } from "distube";

import { distube } from "../distube";
import {
  deletePlayerPanel,
  disablePlayerPanel,
  getPlayerPanel,
  updatePlayerPanel,
} from "../features/player-panel";

export function registerDistubeEvents(): void {
  distube
    .on(Events.PLAY_SONG, (queue, song) => {
      const stream = song?.stream as { playFromSource?: boolean; url?: string; song?: { name?: string; source?: string; url?: string; stream?: { url?: string } } } | undefined;
      const fallback = stream?.song;
      console.log(
        `[distube] PLAY_SONG queue=${queue.id} song="${song?.name}" source=${song?.source} playFromSource=${stream?.playFromSource} url=${song?.url}` +
          (fallback
            ? ` | fallback song="${fallback.name}" source=${fallback.source} url=${fallback.url} streamUrl=${fallback.stream?.url?.slice(0, 80)}...`
            : ""),
      );
      updatePlayerPanel(queue.id);
    })
    .on(Events.ADD_SONG, (queue, song) => {
      console.log(
        `[distube] ADD_SONG queue=${queue.id} song="${song?.name}" source=${song?.source} playFromSource=${song?.stream?.playFromSource}`,
      );
      updatePlayerPanel(queue.id);
      const channel = queue.textChannel;
      if (queue.songs.length > 1 && channel && "send" in channel) {
        channel
          .send(`🎶 Adicionada: ${song.name || song.url}`)
          .catch(() => {});
      }
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
      console.log(
        `[distube] ADD_LIST queue=${queue.id} playlist="${playlist?.name}" songs=${playlist?.songs?.length}`,
      );
      updatePlayerPanel(queue.id);
      const channel = queue.textChannel;
      if (channel && "send" in channel) {
        channel
          .send(
            `🎶 Playlist adicionada: ${playlist.name || "sem nome"} (${playlist.songs.length} músicas)`,
          )
          .catch(() => {});
      }
    })
    .on(Events.FINISH_SONG, (queue, song) => {
      console.log(
        `[distube] FINISH_SONG queue=${queue.id} song="${song?.name}"`,
      );
    })
    .on(Events.FINISH, (queue) => {
      console.log(`[distube] FINISH queue=${queue.id}`);
      const panel = getPlayerPanel(queue.id);
      disablePlayerPanel(panel);
      deletePlayerPanel(queue.id);
    })
    .on(Events.DELETE_QUEUE, (queue) => {
      console.log(`[distube] DELETE_QUEUE queue=${queue.id}`);
    })
    .on(Events.DISCONNECT, (queue) => {
      console.log(`[distube] DISCONNECT queue=${queue.id}`);
      const panel = getPlayerPanel(queue.id);
      disablePlayerPanel(panel);
      deletePlayerPanel(queue.id);
    })
    .on(Events.NO_RELATED, (queue, error) => {
      console.log(`[distube] NO_RELATED queue=${queue.id} error=${error?.message}`);
    })
    .on(Events.ERROR, (error, queue, song) => {
      console.error(
        `[distube] ERROR queue=${queue?.id} song="${song?.name}" source=${song?.source}:`,
        error,
      );
      const channel = queue?.textChannel;
      if (channel && "send" in channel) {
        channel
          .send("⚠️ Deu ruim pra tocar essa música, pulando...")
          .catch(() => {});
      }
    })
    .on(Events.FFMPEG_DEBUG, (debug) => {
      // Mostra o stderr do ffmpeg — revela 403/404 nos segmentos do SoundCloud, etc.
      console.log(`[ffmpeg] ${debug}`);
    });
}
