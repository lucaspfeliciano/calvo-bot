import { client } from "./client";
import { assertEnv, env } from "./config";
import "./distube";
import { registerDistubeEvents } from "./events/distube";
import { registerInteractionCreateEvent } from "./events/interactionCreate";
import { registerMessageCreateEvent } from "./events/messageCreate";
import { registerReadyEvent } from "./events/ready";
import { startHealthServer } from "./health-server";

assertEnv();

startHealthServer();

registerReadyEvent();
registerMessageCreateEvent();
registerInteractionCreateEvent();
registerDistubeEvents();

client.login(env.token).catch((error) => {
  console.error("Falha ao logar no Discord:", error);
  process.exit(1);
});
