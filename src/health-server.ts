import http from "http";

// Intervalo do auto-ping. Render free dorme após ~15min sem request HTTP; 10min mantém vivo.
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Mantém o serviço acordado no Render free batendo na própria URL pública periodicamente.
 * Usa RENDER_EXTERNAL_URL (injetada pelo Render) ou KEEP_ALIVE_URL como override.
 */
function startKeepAlive(): void {
  const url = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!url) {
    console.log("ℹ️ Keep-alive desativado (sem RENDER_EXTERNAL_URL/KEEP_ALIVE_URL).");
    return;
  }

  setInterval(() => {
    fetch(url).catch(() => {
      // Falha de ping é irrelevante — só serve pra resetar o timer de inatividade.
    });
  }, KEEP_ALIVE_INTERVAL_MS).unref();

  console.log(`🔄 Keep-alive ativo: pingando ${url} a cada 10min.`);
}

export function startHealthServer(): void {
  const port = Number(process.env.PORT) || 3000;

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`🩺 Health server escutando em :${port}`);
    startKeepAlive();
  });

  server.on("error", (error) => {
    console.error("Health server error:", error);
  });
}
