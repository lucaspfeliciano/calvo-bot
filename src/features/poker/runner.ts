import type { Guild, GuildMember, Message } from "discord.js";

import { POKER_BURN_DELAY_MS, POKER_REVEAL_DELAY_MS } from "../../config";
import type { Card, PokerPlayerResult } from "../../types";
import { shuffle } from "../../utils/random";
import { sleep } from "../../utils/time";
import { createDeck, drawCard } from "./deck";
import { buildPokerEmbed } from "./embed";
import { compareHandsDesc, evaluateSevenCards } from "./evaluator";

async function getPokerPlayers(
  guild: Guild,
  channelId: string | null | undefined,
): Promise<GuildMember[]> {
  if (!channelId) return [];

  const byId = new Map<string, GuildMember>();
  guild.voiceStates.cache.forEach((voiceState) => {
    if (voiceState.channelId !== channelId) return;
    const member = voiceState.member;
    if (!member || member.user.bot) return;
    byId.set(member.id, member);
  });

  return [...byId.values()];
}

export async function runNetinhoPoker(message: Message<true>): Promise<unknown> {
  const pokerMessagePromise = message.reply("🃏 Embaralhando as cartas...");
  const players = await getPokerPlayers(
    message.guild,
    message.member?.voice?.channelId,
  );
  const pokerMessage = await pokerMessagePromise;

  if (players.length < 2) {
    return pokerMessage.edit(
      "Não achei jogadores online suficientes pra mesa do Netinho. Preciso de pelo menos 2.",
    );
  }

  const selectedPlayers = shuffle([...players]).slice(0, 9);
  const deck = createDeck();
  shuffle(deck);

  const communityCards: Card[] = [
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
    drawCard(deck),
  ];

  const results: PokerPlayerResult[] = selectedPlayers.map((member) => {
    const holeCards = [drawCard(deck), drawCard(deck)];
    const bestHand = evaluateSevenCards([...holeCards, ...communityCards]);
    return { member, holeCards, bestHand };
  });

  results.sort((a, b) => compareHandsDesc(a.bestHand, b.bestHand));
  const topHand = results[0]!.bestHand;
  const winners = results.filter(
    (result) => compareHandsDesc(result.bestHand, topHand) === 0,
  );

  await pokerMessage.edit({
    embeds: [buildPokerEmbed({ results, step: "preflop" })],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        step: "burn1",
        suspenseText: "🔥 Queimando uma carta... o flop vem aí.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 1,
        step: "flop1",
        suspenseText: "👀 Primeira carta do flop na mesa...",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS - 200);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 2,
        step: "flop2",
        suspenseText: "😮 Segunda carta revelada...",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS - 200);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 3,
        step: "flop",
        suspenseText: "🟩 Flop completo. As reads comecam.",
      }),
    ],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 3,
        step: "burn2",
        suspenseText: "🔥 Mais uma carta queimada... preparando o turn.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 4,
        step: "turn",
        suspenseText: "🟨 Turn aberto! Quem segurou o all-in?",
      }),
    ],
  });

  await sleep(POKER_BURN_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 4,
        step: "burn3",
        suspenseText: "🔥 Ultima carta queimada... river decisivo.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  await pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 5,
        step: "river",
        suspenseText: "🟥 River na mesa. Agora e coracao.",
      }),
    ],
  });

  await sleep(POKER_REVEAL_DELAY_MS);
  return pokerMessage.edit({
    embeds: [
      buildPokerEmbed({
        results,
        communityCards,
        revealedCount: 5,
        step: "showdown",
        winners,
        suspenseText: "🏁 Showdown! Cartas na mesa.",
      }),
    ],
  });
}
