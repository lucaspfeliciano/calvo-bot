import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type Message,
  type StringSelectMenuInteraction,
} from "discord.js";

import { MALAFA_DIAGNOSES, MALAFA_SYMPTOMS } from "../data/quotes";
import { pickRandom } from "../utils/random";

export async function startMalafaCommand(message: Message<true>): Promise<unknown> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`malafa_symptoms_${message.author.id}`)
    .setPlaceholder("Selecione seus sintomas")
    .setMinValues(1)
    .setMaxValues(Math.min(4, MALAFA_SYMPTOMS.length))
    .addOptions(
      MALAFA_SYMPTOMS.map((symptom) => ({
        label: symptom.label,
        value: symptom.value,
        emoji: symptom.emoji,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🩺 Clínica do Dr. Malafa")
        .setColor(0x3498db)
        .setDescription(
          [
            "Selecione de 1 a 4 sintomas no menu abaixo.",
            "Eu vou te entregar um diagnóstico altamente questionável.",
          ].join("\n"),
        ),
    ],
    components: [row],
  });
}

export async function handleMalafaInteraction(
  interaction: StringSelectMenuInteraction,
): Promise<unknown> {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const ownerId = parts[2];

  if (action !== "symptoms" || !ownerId) {
    return interaction.reply({
      content: "Interação inválida da clínica do Malafa.",
      ephemeral: true,
    });
  }

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "Só quem abriu a consulta pode enviar os sintomas.",
      ephemeral: true,
    });
  }

  const selectedSymptoms = interaction.values
    .map((value) => MALAFA_SYMPTOMS.find((symptom) => symptom.value === value)?.label)
    .filter((label): label is NonNullable<typeof label> => Boolean(label));

  if (!selectedSymptoms.length) {
    return interaction.reply({
      content: "Você precisa selecionar pelo menos 1 sintoma.",
      ephemeral: true,
    });
  }

  const diagnosis = pickRandom(MALAFA_DIAGNOSES);

  return interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("🧾 Diagnóstico do Dr. Malafa")
        .setColor(0xe67e22)
        .setDescription(
          [
            `**Sintomas informados:** ${selectedSymptoms.join(", ")}`,
            "",
            `**Resultado:** ${diagnosis.title}`,
            `**Prescrição:** ${diagnosis.advice}`,
            "",
            "⚠️ Diagnóstico humorístico. Se estiver mal, procure um médico de verdade.",
          ].join("\n"),
        ),
    ],
    components: [],
  });
}
