import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type Message,
  type BaseMessageOptions,
} from "discord.js";

import type { CsLobbySession, Participant } from "../types";
import { createSessionId } from "../utils/discord";

const sessions = new Map<string, CsLobbySession>();

export type LobbyStartResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function buildPayload(
  session: CsLobbySession,
  participants: Participant[] | null = null,
  forceClosed = false,
): BaseMessageOptions {
  const joined = session.joinedIds.map((id, index) => `${index + 1}. <@${id}>`);
  const availableCount =
    (session.eligibleIds || []).length - session.joinedIds.length;
  const isClosed = forceClosed || session.stage === "done";

  const embed = new EmbedBuilder()
    .setTitle("🎯 Lobby do CS - Ramon")
    .setColor(isClosed ? 0x2ecc71 : 0x3498db)
    .setDescription(
      [
        `Canal de voz: <#${session.voiceChannelId}>`,
        `Vagas preenchidas: ${session.joinedIds.length}/5`,
        `Disponíveis no canal: ${Math.max(availableCount, 0)}`,
        "",
        "**Line atual:**",
        joined.join("\n") || "Ninguém entrou ainda.",
        "",
        isClosed
          ? session.joinedIds.length >= 5
            ? "✅ Line fechada com 5 jogadores."
            : "🛑 Lobby encerrado pelo organizador."
          : "Clique em **Entrar** para confirmar presença.",
      ].join("\n"),
    );

  if (participants?.length) {
    embed.addFields({
      name: "Participantes elegíveis",
      value: participants
        .map((participant) => `<@${participant.id}>`)
        .join(", "),
    });
  }

  if (isClosed) {
    return { embeds: [embed], components: [] };
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`cs_join_${session.id}`)
      .setLabel("Entrar na line")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cs_leave_${session.id}`)
      .setLabel("Sair da line")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`cs_close_${session.id}`)
      .setLabel("Encerrar")
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export async function startCsLobbyCommand(
  message: Message<true>,
): Promise<LobbyStartResult> {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return {
      ok: false,
      message: "Entra em um canal de voz pra abrir a line do CS.",
    };
  }

  const participants: Participant[] = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (!participants.length) {
    return {
      ok: false,
      message: "Não achei jogadores no canal de voz atual.",
    };
  }

  const sessionId = createSessionId("cs");
  const session: CsLobbySession = {
    id: sessionId,
    guildId: message.guild.id,
    textChannelId: message.channel.id,
    voiceChannelId: voiceChannel.id,
    creatorId: message.author.id,
    eligibleIds: participants.map((participant) => participant.id),
    joinedIds: [],
    stage: "open",
    messageId: null,
  };

  const payload = buildPayload(session, participants);
  const lobbyMessage = await message.channel.send(payload);

  session.messageId = lobbyMessage.id;
  sessions.set(sessionId, session);

  return {
    ok: true,
    message: "✅ Lobby do CS aberto. Usem os botões pra entrar na line de 5.",
  };
}

export async function handleCsLobbyInteraction(
  interaction: ButtonInteraction,
): Promise<unknown> {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const sessionId = parts.slice(2).join("_");

  if (!action || !sessionId) {
    return interaction.reply({
      content: "Interação inválida do lobby de CS.",
      ephemeral: true,
    });
  }

  const session = sessions.get(sessionId);
  if (!session || session.stage === "done") {
    return interaction.reply({
      content: "Esse lobby já foi encerrado.",
      ephemeral: true,
    });
  }

  if (interaction.guildId !== session.guildId) {
    return interaction.reply({
      content: "Esse lobby não é deste servidor.",
      ephemeral: true,
    });
  }

  if (action === "join") {
    if (!session.eligibleIds.includes(interaction.user.id)) {
      return interaction.reply({
        content:
          "Só quem está no canal de voz onde o lobby foi criado pode entrar.",
        ephemeral: true,
      });
    }

    if (session.joinedIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "Você já está na line.",
        ephemeral: true,
      });
    }

    if (session.joinedIds.length >= 5) {
      return interaction.reply({
        content: "A line já fechou com 5 jogadores.",
        ephemeral: true,
      });
    }

    session.joinedIds.push(interaction.user.id);
  }

  if (action === "leave") {
    if (!session.joinedIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "Você não está na line.",
        ephemeral: true,
      });
    }

    session.joinedIds = session.joinedIds.filter(
      (id) => id !== interaction.user.id,
    );
  }

  if (action === "close") {
    if (interaction.user.id !== session.creatorId) {
      return interaction.reply({
        content: "Só quem abriu o lobby pode encerrar.",
        ephemeral: true,
      });
    }

    session.stage = "done";
    sessions.delete(sessionId);
    return interaction.update(buildPayload(session, null, true));
  }

  if (session.joinedIds.length >= 5) {
    session.stage = "done";
    sessions.delete(sessionId);
    return interaction.update(buildPayload(session, null, true));
  }

  return interaction.update(buildPayload(session));
}
