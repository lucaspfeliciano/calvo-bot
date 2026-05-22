import type { Guild, Message } from "discord.js";

import { JEFF_USER_ID } from "../config";

export async function muteJeff(guild: Guild, reason: string): Promise<boolean> {
  try {
    const target = await guild.members.fetch(JEFF_USER_ID);
    if (!target?.voice?.channel) return false;

    await target.voice.setMute(true, reason);
    return true;
  } catch (error) {
    console.error("Erro ao mutar Jeff:", error);
    return false;
  }
}

export async function unmuteJeff(guild: Guild, reason: string): Promise<boolean> {
  try {
    const target = await guild.members.fetch(JEFF_USER_ID);
    if (!target?.voice?.channel) return false;

    await target.voice.setMute(false, reason);
    return true;
  } catch (error) {
    console.error("Erro ao liberar Jeff:", error);
    return false;
  }
}

export async function theKiller(message: Message<true>): Promise<string> {
  try {
    const guild = message.guild;
    const jeff = await guild.members.fetch(JEFF_USER_ID);
    const jeffChannel = jeff?.voice?.channel;

    const targetChannel = jeffChannel ?? message.member?.voice?.channel ?? null;
    if (!targetChannel) return "Ninguém está em canal de voz agora.";

    const members = targetChannel.members.filter((m) => !m.user.bot);
    if (!members.size) return "Não tem ninguém no canal agora.";

    await Promise.all(
      members.map((m) =>
        m.id === JEFF_USER_ID
          ? m.voice.setMute(false, "thekiller")
          : m.voice.setMute(true, "thekiller"),
      ),
    );

    return "🔇 Xiiuuu. Apenas o Jeff fala.";
  } catch (error) {
    console.error("Erro no theKiller:", error);
    return "Não consegui executar o thekiller agora.";
  }
}
