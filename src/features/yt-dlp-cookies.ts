import fs from "fs";
import os from "os";
import path from "path";

/**
 * Configura cookies pro yt-dlp escrevendo um config file ao lado do binário.
 * Procura cookies em:
 *   1. env YT_DLP_COOKIES — conteúdo Netscape do cookies.txt
 *   2. yt-dlp-cookies.txt na raiz do projeto
 *
 * Retorna o caminho do arquivo de cookies (pra log) ou undefined se nenhum foi achado.
 */
export function setupYtDlpCookies(): string | undefined {
  const cookiesPath = writeCookiesFile();
  if (!cookiesPath) return undefined;

  writeYtDlpConfig(cookiesPath);
  return cookiesPath;
}

function writeCookiesFile(): string | undefined {
  const envContent = process.env.YT_DLP_COOKIES;
  if (envContent && envContent.trim().length > 0) {
    const tmp = path.join(os.tmpdir(), "yt-dlp-cookies.txt");
    fs.writeFileSync(tmp, envContent, "utf8");
    return tmp;
  }

  const local = path.join(process.cwd(), "yt-dlp-cookies.txt");
  if (fs.existsSync(local)) return local;

  return undefined;
}

function writeYtDlpConfig(cookiesPath: string): void {
  // O binário fica em node_modules/@distube/yt-dlp/bin/yt-dlp(.exe).
  // O yt-dlp lê yt-dlp.conf no MESMO diretório do binário (portable config).
  // Resolve via entry point porque o pacote tem `exports` que bloqueia acessar package.json direto.
  const entry = require.resolve("@distube/yt-dlp"); // → .../@distube/yt-dlp/dist/index.js
  const pluginDir = path.dirname(path.dirname(entry));
  const binDir = path.join(pluginDir, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const configPath = path.join(binDir, "yt-dlp.conf");
  fs.writeFileSync(configPath, `--cookies ${cookiesPath}\n`, "utf8");
}
