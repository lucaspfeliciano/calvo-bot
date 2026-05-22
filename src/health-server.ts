import http from "http";

export function startHealthServer(): void {
  const port = Number(process.env.PORT) || 3000;

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`🩺 Health server escutando em :${port}`);
  });

  server.on("error", (error) => {
    console.error("Health server error:", error);
  });
}
