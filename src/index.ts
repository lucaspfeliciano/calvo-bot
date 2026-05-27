import { client } from "./client";
import { assertEnv, env } from "./config";
import { shoukaku } from "./lavalink";
import { registerInteractionCreateEvent } from "./events/interactionCreate";
import { registerMessageCreateEvent } from "./events/messageCreate";
import { registerReadyEvent } from "./events/ready";
import { attachPanelToQueueLifecycle } from "./features/player-panel";
import { startHealthServer } from "./health-server";

assertEnv();

startHealthServer();

registerReadyEvent();
registerMessageCreateEvent();
registerInteractionCreateEvent();
attachPanelToQueueLifecycle();

// Toca o import pra garantir que o singleton do Shoukaku foi criado/conectado.
void shoukaku;

client.login(env.token).catch((error) => {
  console.error("Falha ao logar no Discord:", error);
  process.exit(1);
});
