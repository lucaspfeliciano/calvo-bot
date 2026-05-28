import { EmbedBuilder } from "discord.js";

import type { Card, PokerPlayerResult } from "../../types";
import { cardRank, cardSuit } from "./deck";

const SUSPENSE_BY_STEP: Record<string, string> = {
  preflop: "🃏 Pré-flop: todo mundo de olho no dealer.",
  burn1: "🔥 Burn card antes do flop.",
  flop1: "👀 Flop começando...",
  flop2: "😮 A mesa tá ficando perigosa.",
  flop: "🟩 Flop aberto.",
  burn2: "🔥 Burn card antes do turn.",
  turn: "🟨 Turn aberto.",
  burn3: "🔥 Burn card antes do river.",
  river: "🟥 River aberto.",
  showdown: "🏁 Showdown!",
};

const PHASES = ["Pré-flop", "Flop", "Turn", "River", "Showdown"] as const;

const PHASE_INDEX_BY_STEP: Record<string, number> = {
  preflop: 0,
  burn1: 0,
  flop1: 1,
  flop2: 1,
  flop: 1,
  burn2: 1,
  turn: 2,
  burn3: 2,
  river: 3,
  showdown: 4,
};

const PHASE_COLORS = [0x95a5a6, 0x2ecc71, 0xf1c40f, 0xe67e22, 0xffd700];

export type PokerEmbedInput = {
  results: PokerPlayerResult[];
  communityCards?: Card[];
  revealedCount?: number;
  step: string;
  winners?: PokerPlayerResult[];
  suspenseText?: string | null;
};

/** Renderiza uma carta (ou verso) como 4 linhas de arte ASCII, largura interna 3. */
function cardArt(card: Card | null): [string, string, string, string] {
  if (!card) {
    return ["┌───┐", "│ ? │", "│   │", "└───┘"];
  }
  const rank = cardRank(card).padEnd(3, " ");
  const suit = `  ${cardSuit(card)}`;
  return ["┌───┐", `│${rank}│`, `│${suit}│`, "└───┘"];
}

/** Junta várias cartas lado a lado, retornando as 4 linhas resultantes. */
function cardRow(cards: (Card | null)[]): string[] {
  const arts = cards.map(cardArt);
  return [0, 1, 2, 3].map((line) => arts.map((a) => a[line]).join(" "));
}

function buildStepper(step: string): string {
  const idx = PHASE_INDEX_BY_STEP[step] ?? 0;
  return PHASES.map((p, i) =>
    i === idx ? `[${p.toUpperCase()}]` : p,
  ).join(" › ");
}

export function buildPokerEmbed({
  results,
  communityCards = [],
  revealedCount = 0,
  step,
  winners = [],
  suspenseText = null,
}: PokerEmbedInput): EmbedBuilder {
  const phaseIdx = PHASE_INDEX_BY_STEP[step] ?? 0;
  const isShowdown = step === "showdown";

  // Comunidade: 5 slots, escondidos viram verso.
  const community: (Card | null)[] = Array.from({ length: 5 }).map((_, i) =>
    i < revealedCount ? (communityCards[i] ?? null) : null,
  );

  const winnerIds = new Set(winners.map((w) => w.member.id));
  const nameWidth = Math.min(
    14,
    Math.max(4, ...results.map((r) => r.member.displayName.length)),
  );

  const playerLines = results.map((result) => {
    const name = result.member.displayName.slice(0, nameWidth).padEnd(nameWidth);
    // Largura fixa por carta (rank com 2 + naipe) pra alinhar o "10" com as demais.
    const hole = result.holeCards
      .map((c) => `${cardRank(c).padStart(2)}${cardSuit(c)}`)
      .join(" ");
    const marker = isShowdown && winnerIds.has(result.member.id) ? ">" : " ";
    const hand = isShowdown ? `  ${result.bestHand.name}` : "";
    return `${marker} ${name} │${hole}│${hand}`;
  });

  const block = [
    "```",
    buildStepper(step),
    "",
    ...cardRow(community),
    "",
    ...playerLines,
    "```",
  ].join("\n");

  const suspense = suspenseText || SUSPENSE_BY_STEP[step] || "Rodada em andamento.";

  const embed = new EmbedBuilder()
    .setTitle("🃏 Mesa do Netinho")
    .setColor(PHASE_COLORS[phaseIdx] ?? 0x2ecc71)
    .setDescription(`${suspense}\n${block}`)
    .setFooter({ text: "♥ Copas · ♦ Ouros · ♣ Paus · ♠ Espadas" });

  if (isShowdown && winners.length === 1) {
    embed.addFields({
      name: "🏆 Vencedor",
      value: `${winners[0]!.member.displayName} — ${winners[0]!.bestHand.name}`,
    });
  } else if (isShowdown && winners.length > 1) {
    embed.addFields({
      name: "🏆 Split Pot",
      value: `${winners.map((w) => w.member.displayName).join(", ")} — ${winners[0]!.bestHand.name}`,
    });
  }

  return embed;
}
