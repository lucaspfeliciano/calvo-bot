import { EmbedBuilder } from "discord.js";

import type { Card, PokerPlayerResult } from "../../types";
import { formatCard } from "./deck";

const STATUS_BY_STEP: Record<string, string> = {
  preflop: "🃏 Pré-flop: todo mundo de olho no dealer.",
  burn1: "🔥 Burn card antes do flop.",
  flop1: "👀 Flop começando...",
  flop2: "😮 A mesa tá ficando perigosa.",
  flop: "🟩 Flop aberto.",
  burn2: "🔥 Burn card antes do turn.",
  turn: "🟨 Turn aberto.",
  burn3: "🔥 Burn card antes do river.",
  river: "🟥 River aberto.",
  showdown: "🏁 Showdown.",
};

export type PokerEmbedInput = {
  results: PokerPlayerResult[];
  communityCards?: Card[];
  revealedCount?: number;
  step: string;
  winners?: PokerPlayerResult[];
  suspenseText?: string | null;
};

export function buildPokerEmbed({
  results,
  communityCards = [],
  revealedCount = 0,
  step,
  winners = [],
  suspenseText = null,
}: PokerEmbedInput): EmbedBuilder {
  const tableCards = Array.from({ length: 5 }).map((_, index) => {
    const card = communityCards[index];
    if (!card) return "🂠";
    return index < revealedCount ? formatCard(card) : "🂠";
  });

  const playerLines = results.map((result, index) => {
    const hole = result.holeCards.map(formatCard).join(" ");
    const handInfo = step === "showdown" ? ` -> ${result.bestHand.name}` : "";
    return `${index + 1}. ${result.member.displayName}: ${hole}${handInfo}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("Mesa do Netinho")
    .setColor(0x2ecc71)
    .setDescription(
      [
        suspenseText || STATUS_BY_STEP[step] || "Rodada em andamento.",
        `Mesa: ${tableCards.join(" ")}`,
        "Nipes: ♥ Copas | ♦ Ouros | ♣ Paus | ♠ Espadas",
        "",
        "**Jogadores:**",
        ...playerLines,
      ].join("\n"),
    );

  if (step === "showdown") {
    if (winners.length === 1) {
      embed.addFields({
        name: "Vencedor",
        value: `${winners[0]!.member.displayName} com ${winners[0]!.bestHand.name}`,
      });
    } else if (winners.length > 1) {
      embed.addFields({
        name: "Split Pot",
        value: `${winners.map((winner) => winner.member.displayName).join(", ")} com ${winners[0]!.bestHand.name}`,
      });
    }
  }

  return embed;
}
