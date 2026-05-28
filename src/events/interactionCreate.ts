import { client } from "../client";
import { distube } from "../distube";
import {
  handleBetButton,
  handleBetCancelButton,
  handleBetCreateButton,
  handleBetCreateModal,
  handleBetModal,
  handleBetResolveButton,
  handleBetWinnerButton,
} from "../features/bet-interactions";
import { runNetinhoHand } from "../features/poker/netinho-bet";
import { handleCsLobbyInteraction } from "../features/cs-lobby";
import { handleMalafaInteraction } from "../features/malafa";
import { handleMixInteraction } from "../features/mix";
import { handlePicksInteraction } from "../features/picks";
import {
  deletePlayerPanel,
  disablePlayerPanel,
  getPlayerPanel,
  updatePlayerPanel,
} from "../features/player-panel";

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

  const queue = distube.getQueue(guildId);
  if (!queue) {
    return interaction.reply({
      content: "Não tem nada tocando agora.",
      ephemeral: true,
    });
  }

  if (action === "skip") {
    try {
      await distube.skip(guildId);
    } catch {
      await distube.stop(guildId).catch(() => {});
    }
    await interaction.reply({ content: "⏭️ Música pulada.", ephemeral: true });
    return updatePlayerPanel(guildId);
  }

  if (action === "stop") {
    await distube.stop(guildId).catch(() => {});
    await interaction.reply({
      content: "⏹️ Reprodução parada.",
      ephemeral: true,
    });
    return updatePlayerPanel(guildId);
  }

  if (action === "leave") {
    await distube.stop(guildId).catch(() => {});
    distube.voices.leave(guildId);
    const panel = getPlayerPanel(guildId);
    deletePlayerPanel(guildId);
    await interaction.reply({
      content: "👋 Saí do canal de voz.",
      ephemeral: true,
    });
    return disablePlayerPanel(panel);
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
      if (interaction.customId.startsWith("bet_wager_")) {
        return handleBetButton(interaction);
      }
      if (interaction.customId === "bet_create") {
        return handleBetCreateButton(interaction);
      }
      if (interaction.customId.startsWith("bet_resolve_")) {
        return handleBetResolveButton(interaction);
      }
      if (interaction.customId.startsWith("bet_win_")) {
        return handleBetWinnerButton(interaction);
      }
      if (interaction.customId.startsWith("bet_cancel_")) {
        return handleBetCancelButton(interaction);
      }
      if (interaction.customId.startsWith("bet_start_")) {
        const betId = Number(interaction.customId.split("_")[2]);
        return runNetinhoHand(interaction, betId);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "bet_createmodal") {
        return handleBetCreateModal(interaction);
      }
      if (interaction.customId.startsWith("bet_modal_")) {
        return handleBetModal(interaction);
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
