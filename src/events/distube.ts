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
    .on(Events.PLAY_SONG, (queue) => {
      updatePlayerPanel(queue.id);
    })
    .on(Events.ADD_SONG, (queue, song) => {
      updatePlayerPanel(queue.id);
      const channel = queue.textChannel;
      if (queue.songs.length > 1 && channel && "send" in channel) {
        channel
          .send(`🎶 Adicionada: ${song.name || song.url}`)
          .catch(() => {});
      }
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
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
    .on(Events.FINISH, (queue) => {
      const panel = getPlayerPanel(queue.id);
      disablePlayerPanel(panel);
      deletePlayerPanel(queue.id);
    })
    .on(Events.DISCONNECT, (queue) => {
      const panel = getPlayerPanel(queue.id);
      disablePlayerPanel(panel);
      deletePlayerPanel(queue.id);
    })
    .on(Events.ERROR, (error, queue) => {
      console.error("DisTube error:", error);
      const channel = queue?.textChannel;
      if (channel && "send" in channel) {
        channel
          .send("⚠️ Deu ruim pra tocar essa música, pulando...")
          .catch(() => {});
      }
    });
}
