import type { Message } from "discord.js";

import { client } from "../client";
import { getCommand } from "../commands";

export function registerMessageCreateEvent(): void {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (!message.content.startsWith("$")) return;

    const args = message.content.split(" ");
    const trigger = args.shift()?.toLowerCase();
    if (!trigger) return;

    const command = getCommand(trigger);
    if (!command) return;

    const query = args.join(" ");

    if (command.requiresVoice && !message.member?.voice?.channel) {
      await message.reply("Entra em um canal de voz primeiro burrão");
      return;
    }

    try {
      await command.run({
        message: message as Message<true>,
        args,
        query,
      });
    } catch (error) {
      console.error(`Erro ao executar ${trigger}:`, error);
      message.reply("Deu erro no comando 😢").catch(() => {});
    }
  });
}
