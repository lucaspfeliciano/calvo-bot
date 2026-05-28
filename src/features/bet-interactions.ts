import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { COIN_EMOJI } from "../config";
import { placeWager, refreshBetMessage } from "./betting";

/** Botão "Apostar em X" → abre um modal pedindo a quantia. */
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

/** Submit do modal → registra a aposta e atualiza o embed. */
export async function handleBetModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  // customId: bet_modal_<betId>_<optionId>
  const [, , betIdRaw, optionIdRaw] = interaction.customId.split("_");
  const betId = Number(betIdRaw);
  const optionId = Number(optionIdRaw);
  const amount = Number(interaction.fields.getTextInputValue("amount").trim());

  const result = await placeWager(
    betId,
    interaction.user.id,
    optionId,
    amount,
  );

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
