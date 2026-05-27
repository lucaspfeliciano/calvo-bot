import { client } from "../client";
import { getQueue } from "../features/queue";
import { handleCsLobbyInteraction } from "../features/cs-lobby";
import { handleMalafaInteraction } from "../features/malafa";
import { handleMixInteraction } from "../features/mix";
import { handlePicksInteraction } from "../features/picks";
import { updatePlayerPanel } from "../features/player-panel";

async function handlePlayerButton(
  interaction: import("discord.js").ButtonInteraction,
): Promise<unknown> {
  const [, action, guildId] = interaction.customId.split("_");
  if (!guildId || interaction.guildId !== guildId) {
    return interaction.reply({
      content: "Esse painel não é deste servidor.",
      ephemeral: true,
    });
  }

  if (action === "refresh") {
    await updatePlayerPanel(guildId);
    return interaction.reply({
      content: "Painel atualizado.",
      ephemeral: true,
    });
  }

  const queue = getQueue(guildId);
  if (!queue) {
    return interaction.reply({
      content: "Não tem nada tocando agora.",
      ephemeral: true,
    });
  }

  if (action === "skip") {
    await queue.skip();
    return interaction.reply({ content: "⏭️ Música pulada.", ephemeral: true });
  }

  if (action === "stop") {
    await queue.stop();
    return interaction.reply({
      content: "⏹️ Reprodução parada.",
      ephemeral: true,
    });
  }

  if (action === "leave") {
    await queue.destroy();
    return interaction.reply({
      content: "👋 Saí do canal de voz.",
      ephemeral: true,
    });
  }

  return null;
}

export function registerInteractionCreateEvent(): void {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("cs_")) {
        return handleCsLobbyInteraction(interaction);
      }
      if (interaction.customId.startsWith("player_")) {
        return handlePlayerButton(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("malafa_")) {
        return handleMalafaInteraction(interaction);
      }
      if (interaction.customId.startsWith("mix_")) {
        return handleMixInteraction(interaction);
      }
      if (interaction.customId.startsWith("picks_")) {
        return handlePicksInteraction(interaction);
      }
    }
  });
}
