import type { Command } from "../types";
import { gamesCommands } from "./games";
import { miscCommands } from "./misc";
import { moderationCommands } from "./moderation";
import { musicCommands } from "./music";

const ALL_COMMANDS: Command[] = [
  ...musicCommands,
  ...moderationCommands,
  ...miscCommands,
  ...gamesCommands,
];

const commandsByName = new Map<string, Command>();
for (const command of ALL_COMMANDS) {
  for (const name of command.names) {
    commandsByName.set(name.toLowerCase(), command);
  }
}

export function getCommand(name: string): Command | undefined {
  return commandsByName.get(name.toLowerCase());
}

export function getAllCommands(): Command[] {
  return ALL_COMMANDS;
}
