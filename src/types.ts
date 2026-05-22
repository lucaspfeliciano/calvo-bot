import type { Message, GuildMember, TextBasedChannel } from "discord.js";

export type CommandContext = {
  message: Message<true>;
  args: string[];
  query: string;
};

export type CommandHandler = (ctx: CommandContext) => Promise<unknown> | unknown;

export type Command = {
  names: string[];
  /** Se true, exige que o autor esteja em um canal de voz. */
  requiresVoice?: boolean;
  run: CommandHandler;
};

export type Participant = {
  id: string;
  name: string;
};

export type MixSession = {
  id: string;
  guildId: string;
  channelId: string;
  creatorId: string;
  participants: Participant[];
  captains: string[];
  teams: Record<string, string[]>;
  available: string[];
  turn: string | null;
  stage: "captains" | "draft";
};

export type PicksStep = { captainIndex: 0 | 1; action: "ban" | "pick" };

export type PicksSession = {
  id: string;
  guildId: string;
  channelId: string;
  creatorId: string;
  participants: Participant[];
  captains: string[];
  stage: "captains" | "veto" | "done";
  mapPool: string[];
  steps: PicksStep[];
  stepIndex: number;
  bans: { map: string; captain: string }[];
  picks: { map: string; captain: string }[];
};

export type CsLobbySession = {
  id: string;
  guildId: string;
  textChannelId: string;
  voiceChannelId: string;
  creatorId: string;
  eligibleIds: string[];
  joinedIds: string[];
  stage: "open" | "done";
  messageId: string | null;
};

export type PlayerPanel = {
  message: Message | null;
  textChannel: TextBasedChannel;
};

export type Card = {
  rank: string;
  suit: "H" | "D" | "C" | "S";
};

export type Hand = {
  category: number;
  tiebreak: number[];
  name: string;
};

export type PokerPlayerResult = {
  member: GuildMember;
  holeCards: Card[];
  bestHand: Hand;
};
