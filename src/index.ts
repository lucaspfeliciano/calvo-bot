import { generateDependencyReport } from "@discordjs/voice";

import { client } from "./client";
import { assertEnv, env } from "./config";
import { initDb } from "./db";
import "./distube";
import { registerDistubeEvents } from "./events/distube";
import { registerInteractionCreateEvent } from "./events/interactionCreate";
import { registerMessageCreateEvent } from "./events/messageCreate";
import { registerReadyEvent } from "./events/ready";
import { startHealthServer } from "./health-server";

assertEnv();

// Relatório de dependências de voz — confirma opus/criptografia/ffmpeg detectados no ambiente.
// (espera 2s pra detecção assíncrona das libs de criptografia terminar)
setTimeout(() => {
  console.log(generateDependencyReport());
}, 2000);

startHealthServer();

registerReadyEvent();
registerMessageCreateEvent();
registerInteractionCreateEvent();
registerDistubeEvents();

// Inicializa o banco (economia/apostas). Best-effort: se falhar, o resto do bot segue.
initDb().catch((error) => {
  console.error("Falha ao inicializar o banco de dados:", error);
});

client.login(env.token).catch((error) => {
  console.error("Falha ao logar no Discord:", error);
  process.exit(1);
});
