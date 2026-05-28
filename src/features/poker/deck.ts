import type { Card } from "../../types";

const SUITS: Card["suit"][] = ["H", "D", "C", "S"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

const SUIT_LABELS: Record<Card["suit"], { symbol: string; short: string }> = {
  H: { symbol: "♥", short: "Copas" },
  D: { symbol: "♦", short: "Ouros" },
  C: { symbol: "♣", short: "Paus" },
  S: { symbol: "♠", short: "Espadas" },
};

const RANK_LABELS: Record<string, string> = {
  T: "10",
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function drawCard(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) throw new Error("Baralho vazio.");
  return card;
}

export function formatCard(card: Card): string {
  const suit = SUIT_LABELS[card.suit];
  const rank = RANK_LABELS[card.rank] || card.rank;
  return `${rank}${suit.symbol}`;
}

/** Rótulo do rank ("10" pro T, senão o próprio). */
export function cardRank(card: Card): string {
  return RANK_LABELS[card.rank] || card.rank;
}

/** Símbolo do naipe (♥ ♦ ♣ ♠) — caractere single-width, alinha em monospace. */
export function cardSuit(card: Card): string {
  return SUIT_LABELS[card.suit].symbol;
}

export function cardValue(rank: string): number {
  const values: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  return values[rank] ?? 0;
}
