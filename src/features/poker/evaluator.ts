import type { Card, Hand } from "../../types";
import { cardValue } from "./deck";

function createHand(category: number, tiebreak: number[], name: string): Hand {
  return { category, tiebreak, name };
}

function getStraightHigh(valuesDesc: number[]): number | null {
  const uniqueDesc = [...new Set(valuesDesc)].sort((a, b) => b - a);
  if (uniqueDesc.includes(14)) {
    uniqueDesc.push(1);
  }

  let run = 1;
  let high = uniqueDesc[0]!;

  for (let i = 1; i < uniqueDesc.length; i += 1) {
    if (uniqueDesc[i - 1]! - 1 === uniqueDesc[i]) {
      run += 1;
      if (run >= 5) return high;
    } else {
      run = 1;
      high = uniqueDesc[i]!;
    }
  }

  return null;
}

function evaluateFiveCards(cards: Card[]): Hand {
  const sortedValues = cards
    .map((card) => cardValue(card.rank))
    .sort((a, b) => b - a);
  const isFlush = cards.every((card) => card.suit === cards[0]!.suit);
  const straightHigh = getStraightHigh(sortedValues);

  const countMap = new Map<number, number>();
  sortedValues.forEach((value) => {
    countMap.set(value, (countMap.get(value) || 0) + 1);
  });

  const groups = [...countMap.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (isFlush && straightHigh) {
    return createHand(8, [straightHigh], "Straight Flush");
  }

  if (groups[0]![1] === 4) {
    const quad = groups[0]![0];
    const kicker = groups.find((group) => group[0] !== quad)![0];
    return createHand(7, [quad, kicker], "Quadra");
  }

  if (groups[0]![1] === 3 && (groups[1]?.[1] ?? 0) >= 2) {
    return createHand(6, [groups[0]![0], groups[1]![0]], "Full House");
  }

  if (isFlush) {
    return createHand(5, sortedValues, "Flush");
  }

  if (straightHigh) {
    return createHand(4, [straightHigh], "Sequencia");
  }

  if (groups[0]![1] === 3) {
    const kickers = groups
      .filter((group) => group[1] === 1)
      .map((group) => group[0])
      .sort((a, b) => b - a);
    return createHand(3, [groups[0]![0], ...kickers], "Trinca");
  }

  if (groups[0]![1] === 2 && groups[1]?.[1] === 2) {
    const pairValues = [groups[0]![0], groups[1]![0]].sort((a, b) => b - a);
    const kicker = groups.find((group) => group[1] === 1)![0];
    return createHand(2, [...pairValues, kicker], "Dois Pares");
  }

  if (groups[0]![1] === 2) {
    const pairValue = groups[0]![0];
    const kickers = groups
      .filter((group) => group[1] === 1)
      .map((group) => group[0])
      .sort((a, b) => b - a);
    return createHand(1, [pairValue, ...kickers], "Par");
  }

  return createHand(0, sortedValues, "Carta Alta");
}

export function evaluateSevenCards(cards: Card[]): Hand {
  let best: Hand | null = null;

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const hand = evaluateFiveCards([
              cards[a]!,
              cards[b]!,
              cards[c]!,
              cards[d]!,
              cards[e]!,
            ]);

            if (!best || compareHandsDesc(hand, best) < 0) {
              best = hand;
            }
          }
        }
      }
    }
  }

  if (!best) throw new Error("Não foi possível avaliar a mão.");
  return best;
}

export function compareHandsDesc(a: Hand, b: Hand): number {
  if (a.category !== b.category) {
    return b.category - a.category;
  }

  const maxLength = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = a.tiebreak[i] || 0;
    const right = b.tiebreak[i] || 0;
    if (left !== right) return right - left;
  }

  return 0;
}
