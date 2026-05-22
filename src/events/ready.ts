import { client } from "../client";

export function registerReadyEvent(): void {
  client.once("clientReady", () => {
    console.log("🎵 Bot online!");
  });
}
