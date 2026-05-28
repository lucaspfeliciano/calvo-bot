import fs from "fs";
import path from "path";

import { pickRandom } from "../utils/random";

// Os memes ficam em assets/fau/ na raiz do projeto (fora do dist/).
// npm start/dev rodam a partir da raiz, então process.cwd() aponta pra lá.
const FAU_DIR = path.join(process.cwd(), "assets", "fau");

const VALID_EXT = new Set([
  ".gif",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp4",
  ".mov",
]);

/** Retorna o caminho de um meme aleatório, ou null se a pasta estiver vazia/ausente. */
export function getRandomFauMeme(): string | null {
  let files: string[];
  try {
    files = fs.readdirSync(FAU_DIR);
  } catch {
    return null;
  }

  const memes = files.filter((f) =>
    VALID_EXT.has(path.extname(f).toLowerCase()),
  );
  if (!memes.length) return null;

  return path.join(FAU_DIR, pickRandom(memes));
}
