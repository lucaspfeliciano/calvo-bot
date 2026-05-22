import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type Message,
  type StringSelectMenuInteraction,
  type InteractionUpdateOptions,
  type BaseMessageOptions,
} from "discord.js";

import { CS_MAP_POOL } from "../data/maps";
import type { PicksSession } from "../types";
import { createSessionId, truncateLabel } from "../utils/discord";

const sessions = new Map<string, PicksSession>();

export async function startPicksCommand(message: Message<true>): Promise<unknown> {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply(
      "Entra em um canal de voz pra começar o veto de mapas.",
    );
  }

  const participants = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
    }));

  if (participants.length < 2) {
    return message.reply(
      "Preciso de pelo menos 2 pessoas no canal pra escolher capitães.",
    );
  }

  if (participants.length > 25) {
    return message.reply(
      "Tem gente demais no canal pra seleção por menu (limite Discord: 25).",
    );
  }

  const sessionId = createSessionId("picks");
  const session: PicksSession = {
    id: sessionId,
    guildId: message.guild.id,
    channelId: voiceChannel.id,
    creatorId: message.author.id,
    participants,
    captains: [],
    stage: "captains",
    mapPool: [...CS_MAP_POOL],
    steps: [
      { captainIndex: 0, action: "ban" },
      { captainIndex: 1, action: "ban" },
      { captainIndex: 0, action: "pick" },
      { captainIndex: 1, action: "pick" },
      { captainIndex: 0, action: "ban" },
      { captainIndex: 1, action: "ban" },
    ],
    stepIndex: 0,
    bans: [],
    picks: [],
  };

  sessions.set(sessionId, session);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`picks_captains_${message.author.id}_${sessionId}`)
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
        .setTitle("Picks/Bans - Seleção de Capitães")
        .setColor(0xe67e22)
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

function buildPicksPayload(session: PicksSession): InteractionUpdateOptions & BaseMessageOptions {
  const step = session.steps[session.stepIndex]!;
  const currentCaptain = session.captains[step.captainIndex]!;
  const actionLabel = step.action === "ban" ? "BAN" : "PICK";
  const actionText =
    step.action === "ban"
      ? `<@${currentCaptain}> deve banir 1 mapa.`
      : `<@${currentCaptain}> deve pickar 1 mapa.`;

  const embed = new EmbedBuilder()
    .setTitle("Picks/Bans de Mapas")
    .setColor(0xf1c40f)
    .setDescription(
      [
        `Capitão A: <@${session.captains[0]}>`,
        `Capitão B: <@${session.captains[1]}>`,
        "",
        `**Turno ${session.stepIndex + 1}/${session.steps.length} - ${actionLabel}**`,
        actionText,
        "",
        "**Picks até agora:**",
        session.picks.length
          ? session.picks
              .map(
                (pick, index) =>
                  `${index + 1}. ${pick.map} - <@${pick.captain}>`,
              )
              .join("\n")
          : "-",
        "",
        "**Bans até agora:**",
        session.bans.length
          ? session.bans
              .map(
                (ban, index) => `${index + 1}. ${ban.map} - <@${ban.captain}>`,
              )
              .join("\n")
          : "-",
        "",
        `Mapas restantes: ${session.mapPool.join(", ") || "-"}`,
      ].join("\n"),
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`picks_map_${session.id}`)
    .setPlaceholder("Escolha o mapa")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      session.mapPool.map((mapName) => ({
        label: mapName,
        value: mapName,
      })),
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  };
}

function buildPicksFinishedPayload(session: PicksSession): InteractionUpdateOptions & BaseMessageOptions {
  const decider = session.mapPool[0] || "Sem decider";

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Picks/Bans finalizados")
        .setColor(0x2ecc71)
        .setDescription(
          [
            `Capitão A: <@${session.captains[0]}>`,
            `Capitão B: <@${session.captains[1]}>`,
            "",
            "**Picks:**",
            session.picks.length
              ? session.picks
                  .map(
                    (pick, index) =>
                      `${index + 1}. ${pick.map} - <@${pick.captain}>`,
                  )
                  .join("\n")
              : "-",
            "",
            "**Bans:**",
            session.bans.length
              ? session.bans
                  .map(
                    (ban, index) =>
                      `${index + 1}. ${ban.map} - <@${ban.captain}>`,
                  )
                  .join("\n")
              : "-",
            "",
            `**Decider:** ${decider}`,
          ].join("\n"),
        ),
    ],
    components: [],
  };
}

export async function handlePicksInteraction(
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
      content: "Interação inválida para picks/bans.",
      ephemeral: true,
    });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return interaction.reply({
      content: "Essa sessão de picks já acabou ou expirou.",
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
    session.stage = "veto";
    session.stepIndex = 0;

    return interaction.update(buildPicksPayload(session));
  }

  if (action === "map") {
    if (session.stage !== "veto") {
      return interaction.reply({
        content: "Essa sessão de picks/bans já foi finalizada.",
        ephemeral: true,
      });
    }

    const step = session.steps[session.stepIndex];
    if (!step) {
      sessions.delete(sessionId);
      return interaction.update(buildPicksFinishedPayload(session));
    }

    const currentCaptain = session.captains[step.captainIndex]!;
    if (interaction.user.id !== currentCaptain) {
      return interaction.reply({
        content: "Não é sua vez no veto.",
        ephemeral: true,
      });
    }

    const selectedMap = interaction.values[0]!;
    if (!session.mapPool.includes(selectedMap)) {
      return interaction.reply({
        content: "Esse mapa não está disponível.",
        ephemeral: true,
      });
    }

    session.mapPool = session.mapPool.filter(
      (mapName) => mapName !== selectedMap,
    );

    if (step.action === "ban") {
      session.bans.push({ map: selectedMap, captain: currentCaptain });
    } else {
      session.picks.push({ map: selectedMap, captain: currentCaptain });
    }

    session.stepIndex += 1;

    if (session.stepIndex >= session.steps.length) {
      session.stage = "done";
      sessions.delete(sessionId);
      return interaction.update(buildPicksFinishedPayload(session));
    }

    return interaction.update(buildPicksPayload(session));
  }

  return null;
}
