import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextBasedChannel,
} from "discord.js";

import { distube } from "../distube";
import type { PlayerPanel } from "../types";

const panels = new Map<string, PlayerPanel>();

export function registerPlayerPanel(
  guildId: string,
  textChannel: TextBasedChannel,
): PlayerPanel {
  const existing = panels.get(guildId);
  if (existing) {
    existing.textChannel = textChannel;
    return existing;
  }
  const panel: PlayerPanel = { message: null, textChannel };
  panels.set(guildId, panel);
  return panel;
}

export function getPlayerPanel(guildId: string): PlayerPanel | undefined {
  return panels.get(guildId);
}

export function deletePlayerPanel(guildId: string): void {
  panels.delete(guildId);
}

function buildPlayerControls(
  guildId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`player_skip_${guildId}`)
      .setLabel("Pular")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_stop_${guildId}`)
      .setLabel("Parar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_leave_${guildId}`)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`player_refresh_${guildId}`)
      .setLabel("Atualizar")
      .setStyle(ButtonStyle.Secondary),
  );
}

type SongLike = { name?: string; url?: string; source?: string };

function buildPlayerEmbed(
  currentSong: SongLike | null,
  queueLength: number,
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("Jeff Player");

  if (!currentSong) {
    embed
      .setDescription("Sem música tocando no momento.")
      .setColor(0x808080)
      .addFields({ name: "Fila", value: "0" });
    return embed;
  }

  embed
    .setDescription(`🎵 ${currentSong.name || currentSong.url}`)
    .setColor(0x00b894)
    .addFields(
      {
        name: "Fonte",
        value: String(currentSong.source || "desconhecida"),
        inline: true,
      },
      { name: "Na fila", value: String(queueLength), inline: true },
    );

  return embed;
}

export async function updatePlayerPanel(guildId: string): Promise<void> {
  const queue = distube.getQueue(guildId);
  const panel = panels.get(guildId);
  const textChannel = panel?.textChannel || (queue?.textChannel as TextBasedChannel | undefined);
  if (!textChannel || !("send" in textChannel)) return;

  if (!panel) {
    panels.set(guildId, { message: null, textChannel });
  }

  const stored = panels.get(guildId)!;
  const currentSong = (queue?.songs?.[0] as SongLike | undefined) || null;
  const queueLength = Math.max((queue?.songs?.length || 0) - 1, 0);
  const embed = buildPlayerEmbed(currentSong, queueLength);
  const controls = buildPlayerControls(guildId, !currentSong);

  try {
    if (stored.message) {
      await stored.message.edit({
        embeds: [embed],
        components: [controls],
      });
      return;
    }

    stored.message = await textChannel.send({
      embeds: [embed],
      components: [controls],
    });
  } catch {
    stored.message = null;
  }
}

export async function disablePlayerPanel(panel: PlayerPanel | undefined): Promise<void> {
  if (!panel?.message) return;

  try {
    const embed = buildPlayerEmbed(null, 0);
    const controls = buildPlayerControls("offline", true);
    await panel.message.edit({
      embeds: [embed],
      components: [controls],
    });
  } catch {
    // Ignore erro de edição de mensagem antiga/apagada.
  }
}
