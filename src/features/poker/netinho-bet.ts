import {
  PermissionFlagsBits,
  type ButtonInteraction,
  type GuildMember,
  type Message,
} from "discord.js";

import { isBettingEnabled } from "../../config";
import {
  cancelBet,
  closeBet,
  createBet,
  formatResolveAnnouncement,
  getBetView,
  refreshBetMessage,
  renderBet,
  resolveBet,
  setBetMessage,
} from "../betting";
import { dealAndAnimate, getPokerPlayers, selectPokerPlayers } from "./runner";

/** $netinhobet: cria a aposta (opções = jogadores) e posta com o botão "Começar a mão". */
export async function startNetinhoBet(
  message: Message<true>,
): Promise<unknown> {
  if (!isBettingEnabled()) {
    return message.reply(
      "💸 Apostas não configuradas (falta DATABASE_URL). Usa o `$netinho` normal.",
    );
  }

  const players = await getPokerPlayers(
    message.guild,
    message.member?.voice?.channelId,
  );
  if (players.length < 2) {
    return message.reply(
      "Preciso de pelo menos 2 jogadores no canal de voz pra mesa do Netinho.",
    );
  }

  const selected = selectPokerPlayers(players);

  const bet = await createBet(
    message.guild.id,
    message.channel.id,
    message.author.id,
    "🃏 Netinho Bet — quem ganha a mão?",
    selected.map((m) => m.displayName.slice(0, 80)),
    { kind: "netinho", playerIds: selected.map((m) => m.id) },
  );

  const sent = await message.channel.send(renderBet(bet));
  await setBetMessage(bet.id, sent.id);

  return message.reply(
    "🎰 **Apostas abertas!** Cliquem no jogador que vai ganhar a mão. " +
      "Quando todo mundo apostar, o criador clica em **▶️ Começar a mão**.",
  );
}

/** Disparado pelo botão "▶️ Começar a mão": fecha apostas, roda a mão e paga. */
export async function runNetinhoHand(
  interaction: ButtonInteraction,
  betId: number,
): Promise<void> {
  const view = await getBetView(betId);
  if (!view || view.kind !== "netinho") {
    await interaction.reply({
      content: "Mesa não encontrada.",
      ephemeral: true,
    });
    return;
  }
  if (view.status !== "open") {
    await interaction.reply({ content: "Essa mão já começou.", ephemeral: true });
    return;
  }

  const isCreator = interaction.user.id === view.creatorId;
  const isAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
  if (!isCreator && !isAdmin) {
    await interaction.reply({
      content: "Só quem criou a mesa (ou um admin) pode começar a mão.",
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

  // Reconstrói os jogadores a partir dos player_ids salvos nas opções.
  const guild = interaction.guild!;
  const optionByPlayer = new Map<string, number>();
  const members: GuildMember[] = [];
  for (const opt of view.options) {
    if (!opt.playerId) continue;
    optionByPlayer.set(opt.playerId, opt.id);
    const member =
      guild.members.cache.get(opt.playerId) ??
      (await guild.members.fetch(opt.playerId).catch(() => null));
    if (member) members.push(member);
  }

  if (members.length < 2) {
    const cancelRes = await cancelBet(betId);
    if (cancelRes.kind === "ok") {
      await interaction.update(renderBet(cancelRes.view)).catch(() => {});
    }
    await interaction
      .followUp({
        content: "Jogadores insuficientes (alguém saiu). Apostas devolvidas.",
        ephemeral: true,
      })
      .catch(() => {});
    return;
  }

  // Fecha as apostas e atualiza a mensagem-embed (isso já confirma a interação).
  const closed = await closeBet(betId);
  if (closed) await interaction.update(renderBet(closed)).catch(() => {});

  // Roda a mão animada com os mesmos jogadores.
  const pokerMessage = await channel.send("🃏 Embaralhando as cartas...");
  const { winners } = await dealAndAnimate(pokerMessage, members);

  if (winners.length !== 1) {
    const cancelRes = await cancelBet(betId);
    if (cancelRes.kind === "ok") {
      await refreshBetMessage(interaction.client, cancelRes.view);
    }
    await channel.send(
      `🤝 Deu empate na mesa do Netinho! As apostas (#${betId}) foram devolvidas.`,
    );
    return;
  }

  const winner = winners[0]!;
  const optionId = optionByPlayer.get(winner.id);
  if (!optionId) return;

  const result = await resolveBet(betId, optionId);
  if (result.kind !== "ok") return;
  await refreshBetMessage(interaction.client, result.view);

  const announcement = await formatResolveAnnouncement(
    interaction.client,
    winner.displayName,
    result,
  );
  await channel.send(announcement);
}
