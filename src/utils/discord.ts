import fs from "fs";
import path from "path";

import type { Participant } from "../types";

export function truncateLabel(label: string | null | undefined): string {
  if (!label) return "Sem nome";
  return label.length > 100 ? `${label.slice(0, 97)}...` : label;
}

export function getParticipantName(
  participants: Participant[],
  id: string,
): string {
  return participants.find((participant) => participant.id === id)?.name || id;
}

export function createSessionId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function getFirstImageFromPublic(): string | null {
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) return null;

  const files = fs.readdirSync(publicDir);
  const imageFile = files.find((file) =>
    /\.(png|jpg|jpeg|gif|webp)$/i.test(file),
  );
  if (!imageFile) return null;

  return path.join(publicDir, imageFile);
}

export function getPublicAssetPath(name: string): string {
  return path.join(process.cwd(), "public", name);
}
