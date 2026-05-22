import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type Message,
  type StringSelectMenuInteraction,
  type InteractionUpdateOptions,
  type BaseMessageOptions,
} from "discord.js";

import { MIX_TEAM_SIZE } from "../config";
import type { MixSession } from "../types";
import { createSessionId, getParticipantName, truncateLabel } from "../utils/discord";

const sessions = new Map<string, MixSession>();

export async function startMixCommand(message: Message<true>): Promise<unknown> {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply("Entra em um canal de voz pra organizar o mix.");
  }

  const participants = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (participants.length < MIX_TEAM_SIZE * 2) {
    return message.reply(
      `Preciso de pelo menos ${MIX_TEAM_SIZE * 2} pessoas no canal pra montar duas lines de ${MIX_TEAM_SIZE}.`,
    );
  }

  if (participants.length > 25) {
    return message.reply(
      "Tem gente demais no canal pra seleção por menu (limite Discord: 25).",
    );
  }

  const sessionId = createSessionId("mix");
  const session: MixSession = {
    id: sessionId,
    guildId: message.guild.id,
    channelId: voiceChannel.id,
    creatorId: message.author.id,
    participants,
    captains: [],
    teams: {},
    available: [],
    turn: null,
    stage: "captains",
  };

  sessions.set(sessionId, session);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mix_captains_${message.author.id}_${sessionId}`)
    .setPlaceholder("Selecione os 2 capitães")
    .setMinValues(2)
    .setMaxValues(2)
    .addOptions(
      participants.map((participant) => ({
        label: truncateLabel(participant.name),
        value: participant.id,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Mix - Seleção de Capitães")
        .setColor(0x3498db)
        .setDescription(
          [
            "Quem executou o comando deve escolher 2 capitães.",
            "",
            "**Participantes do canal:**",
            ...participants.map(
              (participant, index) =>
                `${index + 1}. ${participant.name} (<@${participant.id}>)`,
            ),
          ].join("\n"),
        ),
    ],
    components: [row],
  });
}

function normalizeMixTurn(session: MixSession): void {
  const [captainA, captainB] = session.captains;
  if (!captainA || !captainB) return;
  const teamASize = (session.teams[captainA] || []).length;
  const teamBSize = (session.teams[captainB] || []).length;

  if (teamASize >= MIX_TEAM_SIZE && teamBSize < MIX_TEAM_SIZE) {
    session.turn = captainB;
  }

  if (teamBSize >= MIX_TEAM_SIZE && teamASize < MIX_TEAM_SIZE) {
    session.turn = captainA;
  }
}

function isMixFinished(session: MixSession): boolean {
  const [captainA, captainB] = session.captains;
  if (!captainA || !captainB) return false;
  return (
    (session.teams[captainA] || []).length >= MIX_TEAM_SIZE &&
    (session.teams[captainB] || []).length >= MIX_TEAM_SIZE
  );
}

function buildMixDraftPayload(session: MixSession): InteractionUpdateOptions & BaseMessageOptions {
  const [captainA, captainB] = session.captains;
  const teamA = (session.teams[captainA!] || []).map((id) => `<@${id}>`);
  const teamB = (session.teams[captainB!] || []).map((id) => `<@${id}>`);
  const available = session.available;

  const embed = new EmbedBuilder()
    .setTitle("Mix - Draft em andamento")
    .setColor(0x1abc9c)
    .setDescription(
      [
        `Capitão A: <@${captainA}>`,
        `Capitão B: <@${captainB}>`,
        `Vez de: <@${session.turn}>`,
        "",
        `**Time A (${teamA.length}/${MIX_TEAM_SIZE})**`,
        teamA.join("\n") || "-",
        "",
        `**Time B (${teamB.length}/${MIX_TEAM_SIZE})**`,
        teamB.join("\n") || "-",
        "",
        `Disponíveis: ${available.length}`,
      ].join("\n"),
    );

  const options = available.slice(0, 25).map((id) => ({
    label: truncateLabel(getParticipantName(session.participants, id)),
    value: id,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mix_pick_${session.id}`)
    .setPlaceholder("Escolha 1 jogador para o seu time")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  };
}

function buildMixFinishedPayload(session: MixSession): InteractionUpdateOptions & BaseMessageOptions {
  const [captainA, captainB] = session.captains;
  const teamA = (session.teams[captainA!] || []).map((id) => `<@${id}>`);
  const teamB = (session.teams[captainB!] || []).map((id) => `<@${id}>`);

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Mix fechado")
        .setColor(0x2ecc71)
        .setDescription(
          [
            "As lines foram formadas.",
            "",
            "**Time A**",
            teamA.join("\n") || "-",
            "",
            "**Time B**",
            teamB.join("\n") || "-",
          ].join("\n"),
        ),
    ],
    components: [],
  };
}

export async function handleMixInteraction(
  interaction: StringSelectMenuInteraction,
): Promise<unknown> {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  let sessionId: string;

  if (action === "captains" && parts.length >= 4) {
    const ownerId = parts[2];
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }
    sessionId = parts.slice(3).join("_");
  } else {
    sessionId = parts.slice(2).join("_");
  }

  if (!action || !sessionId) {
    return interaction.reply({
      content: "Interação inválida para o mix.",
      ephemeral: true,
    });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return interaction.reply({
      content: "Essa sessão de mix já acabou ou expirou.",
      ephemeral: true,
    });
  }

  if (action === "captains") {
    if (interaction.user.id !== session.creatorId) {
      return interaction.reply({
        content: "Só quem rodou o comando pode escolher os capitães.",
        ephemeral: true,
      });
    }

    const captains = [...new Set(interaction.values)].slice(0, 2);
    if (captains.length < 2) {
      return interaction.reply({
        content: "Selecione dois capitães diferentes.",
        ephemeral: true,
      });
    }

    session.captains = captains;
    session.teams[captains[0]!] = [captains[0]!];
    session.teams[captains[1]!] = [captains[1]!];
    session.available = session.participants
      .map((participant) => participant.id)
      .filter((id) => !captains.includes(id));
    session.turn = captains[0]!;
    session.stage = "draft";
    normalizeMixTurn(session);

    return interaction.update(buildMixDraftPayload(session));
  }

  if (action === "pick") {
    if (session.stage !== "draft") {
      return interaction.reply({
        content: "Esse draft já foi finalizado.",
        ephemeral: true,
      });
    }

    normalizeMixTurn(session);

    if (interaction.user.id !== session.turn) {
      return interaction.reply({
        content: "Não é sua vez de pickar.",
        ephemeral: true,
      });
    }

    const pickedId = interaction.values[0]!;
    if (!session.available.includes(pickedId)) {
      return interaction.reply({
        content: "Esse jogador não está mais disponível.",
        ephemeral: true,
      });
    }

    session.teams[session.turn!]!.push(pickedId);
    session.available = session.available.filter((id) => id !== pickedId);

    if (isMixFinished(session)) {
      sessions.delete(sessionId);
      return interaction.update(buildMixFinishedPayload(session));
    }

    const otherCaptain = session.captains.find((id) => id !== session.turn)!;
    session.turn = otherCaptain;
    normalizeMixTurn(session);

    if (isMixFinished(session)) {
      sessions.delete(sessionId);
      return interaction.update(buildMixFinishedPayload(session));
    }

    return interaction.update(buildMixDraftPayload(session));
  }

  return null;
}
