import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { COIN_EMOJI } from "../config";
import {
  MAX_OPTIONS,
  buildWinnerPicker,
  cancelBet,
  createBet,
  formatResolveAnnouncement,
  getBetView,
  optionEmoji,
  placeWager,
  refreshBetMessage,
  renderBet,
  resolveBet,
  setBetMessage,
} from "./betting";

function canManage(
  interaction: ButtonInteraction,
  creatorId: string,
): boolean {
  if (interaction.user.id === creatorId) return true;
  return (
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false
  );
}

// ---------- Apostar (botão da opção → modal de quantia) ----------

export async function handleBetButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // customId: bet_wager_<betId>_<optionId>
  const [, , betId, optionId] = interaction.customId.split("_");
  if (!betId || !optionId) return;

  const modal = new ModalBuilder()
    .setCustomId(`bet_modal_${betId}_${optionId}`)
    .setTitle("Fazer aposta");

  const input = new TextInputBuilder()
    .setCustomId("amount")
    .setLabel("Quanto apostar?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("ex: 100");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );

  await interaction.showModal(modal);
}

export async function handleBetModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  // customId: bet_modal_<betId>_<optionId>
  const [, , betIdRaw, optionIdRaw] = interaction.customId.split("_");
  const betId = Number(betIdRaw);
  const optionId = Number(optionIdRaw);
  const amount = Number(interaction.fields.getTextInputValue("amount").trim());

  const result = await placeWager(betId, interaction.user.id, optionId, amount);

  switch (result.kind) {
    case "not_found":
      await interaction.reply({
        content: "Aposta não encontrada.",
        ephemeral: true,
      });
      return;
    case "not_open":
      await interaction.reply({
        content: "Essa aposta não está mais aceitando apostas.",
        ephemeral: true,
      });
      return;
    case "invalid_option":
      await interaction.reply({ content: "Opção inválida.", ephemeral: true });
      return;
    case "bad_amount":
      await interaction.reply({
        content: "Quantia inválida (número ≥ 1).",
        ephemeral: true,
      });
      return;
    case "insufficient":
      await interaction.reply({
        content: "Saldo insuficiente. Vê seu `$saldo` ou usa o `$resgatar`.",
        ephemeral: true,
      });
      return;
    case "ok": {
      await refreshBetMessage(interaction.client, result.view);
      const opt = result.view.options.find((o) => o.id === optionId);
      await interaction.reply({
        content: `✅ Apostou **${amount}** ${COIN_EMOJI} em **${opt?.label ?? "?"}**.`,
        ephemeral: true,
      });
      return;
    }
  }
}

// ---------- Criar aposta (botão → modal) ----------

export async function handleBetCreateButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("bet_createmodal")
    .setTitle("Nova aposta");

  const question = new TextInputBuilder()
    .setCustomId("question")
    .setLabel("Pergunta")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("ex: O time do Lucas ganha?");

  const opt1 = new TextInputBuilder()
    .setCustomId("opt1")
    .setLabel("Opção 1")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue("Sim");

  const opt2 = new TextInputBuilder()
    .setCustomId("opt2")
    .setLabel("Opção 2")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue("Não");

  const opt3 = new TextInputBuilder()
    .setCustomId("opt3")
    .setLabel("Opção 3 (opcional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const opt4 = new TextInputBuilder()
    .setCustomId("opt4")
    .setLabel("Opção 4 (opcional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(question),
    new ActionRowBuilder<TextInputBuilder>().addComponents(opt1),
    new ActionRowBuilder<TextInputBuilder>().addComponents(opt2),
    new ActionRowBuilder<TextInputBuilder>().addComponents(opt3),
    new ActionRowBuilder<TextInputBuilder>().addComponents(opt4),
  );

  await interaction.showModal(modal);
}

export async function handleBetCreateModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.guildId) return;

  const question = interaction.fields.getTextInputValue("question").trim();
  const options = ["opt1", "opt2", "opt3", "opt4"]
    .map((id) => interaction.fields.getTextInputValue(id).trim())
    .filter((v) => v.length > 0)
    .slice(0, MAX_OPTIONS);

  if (!question || options.length < 2) {
    await interaction.reply({
      content: "Precisa de uma pergunta e pelo menos 2 opções.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    await interaction.reply({
      content: "Não consigo postar nesse canal.",
      ephemeral: true,
    });
    return;
  }

  const bet = await createBet(
    interaction.guildId,
    channel.id,
    interaction.user.id,
    question,
    options,
  );

  const sent = await channel.send(renderBet(bet));
  await setBetMessage(bet.id, sent.id);

  await interaction.reply({
    content: `✅ Aposta **#${bet.id}** criada! A galera já pode apostar nos botões.`,
    ephemeral: true,
  });
}

// ---------- Definir vencedor (botão → picker efêmero → resolve) ----------

export async function handleBetResolveButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // customId: bet_resolve_<betId>
  const betId = Number(interaction.customId.split("_")[2]);
  const view = await getBetView(betId);
  if (!view) {
    await interaction.reply({
      content: "Aposta não encontrada.",
      ephemeral: true,
    });
    return;
  }
  if (!canManage(interaction, view.creatorId)) {
    await interaction.reply({
      content: "Só quem criou a aposta (ou um admin) pode definir o vencedor.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "Quem ganhou? Escolhe a opção vencedora:",
    components: buildWinnerPicker(view),
    ephemeral: true,
  });
}

export async function handleBetWinnerButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // customId: bet_win_<betId>_<optionId>
  const [, , betIdRaw, optionIdRaw] = interaction.customId.split("_");
  const betId = Number(betIdRaw);
  const optionId = Number(optionIdRaw);

  const view = await getBetView(betId);
  if (!view) {
    await interaction.update({ content: "Aposta não encontrada.", components: [] });
    return;
  }
  if (!canManage(interaction, view.creatorId)) {
    await interaction.reply({
      content: "Você não pode resolver essa aposta.",
      ephemeral: true,
    });
    return;
  }

  const option = view.options.find((o) => o.id === optionId);
  const result = await resolveBet(betId, optionId);

  if (result.kind !== "ok") {
    await interaction.update({
      content:
        result.kind === "already_done"
          ? "Essa aposta já foi resolvida/cancelada."
          : "Não consegui resolver essa aposta.",
      components: [],
    });
    return;
  }

  await interaction.update({
    content: `✅ Resolvida! Vencedor: ${optionEmoji(option?.position ?? 0)} **${option?.label ?? "?"}**`,
    components: [],
  });

  await refreshBetMessage(interaction.client, result.view);

  const channel = interaction.channel;
  if (channel && channel.isTextBased() && "send" in channel) {
    const announcement = await formatResolveAnnouncement(
      interaction.client,
      option?.label ?? "?",
      result,
    );
    await channel.send(announcement).catch(() => {});
  }
}

// ---------- Cancelar (botão) ----------

export async function handleBetCancelButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // customId: bet_cancel_<betId>
  const betId = Number(interaction.customId.split("_")[2]);
  const view = await getBetView(betId);
  if (!view) {
    await interaction.reply({
      content: "Aposta não encontrada.",
      ephemeral: true,
    });
    return;
  }
  if (!canManage(interaction, view.creatorId)) {
    await interaction.reply({
      content: "Só quem criou a aposta (ou um admin) pode cancelá-la.",
      ephemeral: true,
    });
    return;
  }

  const result = await cancelBet(betId);
  if (result.kind !== "ok") {
    await interaction.reply({
      content: "Essa aposta já foi resolvida/cancelada.",
      ephemeral: true,
    });
    return;
  }

  await interaction.update(renderBet(result.view));
  await interaction
    .followUp({
      content: `❌ Aposta cancelada — ${result.refunds.length} aposta(s) devolvida(s).`,
      ephemeral: true,
    })
    .catch(() => {});
}
