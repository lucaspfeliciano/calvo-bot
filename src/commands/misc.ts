import { AttachmentBuilder, type Message } from "discord.js";

import { EDUARDO_QUOTES, GUI_QUESTIONS } from "../data/quotes";
import { getRandomFauMeme } from "../features/fau";
import { startMalafaCommand } from "../features/malafa";
import type { Command } from "../types";
import {
  getFirstImageFromPublic,
  getPublicAssetPath,
} from "../utils/discord";
import { pickRandom, rollDie } from "../utils/random";
import { sleep } from "../utils/time";
import fs from "fs";

export const helpCommand: Command = {
  names: ["$comandos"],
  run: ({ message }) =>
    message.reply(
      [
        "📜 **Comandos disponíveis**",
        "$comandos - Lista todos os comandos",
        "$play <nome/link> - Adiciona música na fila",
        "$skip - Pula música atual",
        "$stop - Para e limpa fila",
        "$leave - Bot sai da call",
        "$now - Mostra música atual",
        "$queue - Mostra fila",
        "$torugo - Força o hino do Torugo",
        "$netinho - Mesa de poker animada",
        "$netinhobet - Poker do Netinho com aposta de faucoins",
        "$cadinho - Rola Fear/Hope (2d12) com animação",
        "$mix - Monta mix com draft de capitães",
        "$picks - Picks/Bans de mapas",
        "$ramon - Abre lobby interativo de CS (line de 5)",
        "$caslu - Move geral aleatoriamente nas calls",
        "$lemos - Mestre dos magos",
        "$lg - DJ anão entra na sala",
        "$eduardo - Frase motivacional do futevolei",
        "$malafa - Triagem de sintomas + diagnóstico duvidoso",
        "$tadeu - Mensagem especial do Delicio",
        "$jeff / $calvo - Muta o Jeff",
        "$pjl / $desmutajeff - Libera o Jeff (desmuta no servidor)",
        "$thekiller - Muta todo mundo do canal e libera o Jeff",
        "$gui - Enquete aleatória duvidosa",
        "$fau - Meme aleatório zoando o Flamengo",
        "",
        "🎲 **Apostas (faucoins)**",
        "$saldo [@user] - Mostra o saldo de moedas",
        "$resgatar - Resgata moedas grátis (1x por dia)",
        "$ranking - Top 10 mais ricos",
        "$bet criar <pergunta> | op1 | op2 - Abre uma aposta",
        "$apostar <id> <nº> <quantia> - Aposta moedas",
        "$bets - Lista apostas abertas",
        "$bet fechar/resolver/cancelar <id> - Gerencia aposta",
      ].join("\n"),
    ),
};

export const malafaCommand: Command = {
  names: ["$malafa"],
  run: ({ message }) => startMalafaCommand(message),
};

export const tadeuCommand: Command = {
  names: ["$tadeu"],
  run: ({ message }) =>
    message.reply(
      "🍮 Delicio, tua missão é simples: trazer alegria, caos e um combo de lanche pra tropa.",
    ),
};

export const eduardoCommand: Command = {
  names: ["$eduardo"],
  run: ({ message }) => message.reply(pickRandom(EDUARDO_QUOTES)),
};

export const cadinhoCommand: Command = {
  names: ["$cadinho"],
  async run({ message }) {
    const rollingFrames = ["🎲", "🎲 .", "🎲 . .", "🎲 . . ."];
    const rollMessage: Message = await message.reply(
      [
        "🎲 Cadinho invocou os dados de Daggerheart!",
        "Rolando Fear e Hope...",
      ].join("\n"),
    );

    for (let i = 0; i < 6; i += 1) {
      const tempFear = rollDie(12);
      const tempHope = rollDie(12);
      const frame = rollingFrames[i % rollingFrames.length];

      await rollMessage.edit(
        [
          "🎲 Cadinho invocou os dados de Daggerheart!",
          `${frame} Rolando Fear e Hope...`,
          `😨 Fear (d12): **${tempFear}**`,
          `✨ Hope (d12): **${tempHope}**`,
        ].join("\n"),
      );

      await sleep(450);
    }

    const fearRoll = rollDie(12);
    const hopeRoll = rollDie(12);

    return rollMessage.edit(
      [
        "🎲 Cadinho invocou os dados de Daggerheart!",
        "✅ Resultado final:",
        `😨 Fear (d12): **${fearRoll}**`,
        `✨ Hope (d12): **${hopeRoll}**`,
      ].join("\n"),
    );
  },
};

export const guiCommand: Command = {
  names: ["$gui"],
  async run({ message }) {
    const question = pickRandom(GUI_QUESTIONS);
    const pollMessage = await message.reply(
      [
        "❓ **Enquete do Gui (muito duvidosa):**",
        question,
        "",
        "Reaja com 👍 (sim) ou 👎 (nao).",
      ].join("\n"),
    );

    try {
      await pollMessage.react("👍");
      await pollMessage.react("👎");
    } catch {
      // Se faltar permissão de reação, a enquete continua só com texto.
    }
  },
};

export const lgCommand: Command = {
  names: ["$lg"],
  run({ message }) {
    const djImagePath = getFirstImageFromPublic();
    if (!djImagePath) {
      return message.reply("Não achei foto na pasta public 😢");
    }

    const attachment = new AttachmentBuilder(djImagePath);
    return message.reply({
      content: "🎧 DJ anão na pista!",
      files: [attachment],
    });
  },
};

export const lemosCommand: Command = {
  names: ["$lemos"],
  async run({ message }) {
    const lemosImagePath = getPublicAssetPath("lemos.png");
    if (!fs.existsSync(lemosImagePath)) {
      return message.reply("Não achei lemos.png na pasta public 😢");
    }

    const attachment = new AttachmentBuilder(lemosImagePath);
    let disconnectedAuthor = false;

    if (message.member?.voice?.channel) {
      try {
        await message.member.voice.setChannel(null, "Comando $lemos");
        disconnectedAuthor = true;
      } catch {
        // Se não conseguir mover/desconectar, segue com envio da imagem.
      }
    }

    return message.reply({
      content: disconnectedAuthor
        ? "🧙 Mestre dos magos ativado. Você desapareceu da call!"
        : "🧙 Mestre dos magos ativado. Foto enviada, mas você não estava em call.",
      files: [attachment],
    });
  },
};

const FAU_CAPTIONS = [
  "🔴⚫ cheirinho...",
  "Mengão é assim mesmo 🤡",
  "Toma essa, torcedor do Flamengo 😈",
  "Urubu chorando de novo 🦅😭",
  "É campeão de quê mesmo? 🏆🚫",
];

export const fauCommand: Command = {
  names: ["$fau"],
  run: ({ message }) => {
    const meme = getRandomFauMeme();
    if (!meme) {
      return message.reply(
        "Ainda não tem nenhum meme na pasta `assets/fau/` 🤷 — coloca os gifs/imagens lá.",
      );
    }
    return message.reply({
      content: pickRandom(FAU_CAPTIONS),
      files: [new AttachmentBuilder(meme)],
    });
  },
};

export const miscCommands: Command[] = [
  helpCommand,
  malafaCommand,
  tadeuCommand,
  eduardoCommand,
  cadinhoCommand,
  guiCommand,
  lgCommand,
  lemosCommand,
  fauCommand,
];
