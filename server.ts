import "dotenv/config";
import path from "path";
import type { Server } from "http";
import app, { pool, checkDatabase } from "./api/index";

const PORT = Number(process.env.PORT ?? 3000);

let server: Server | undefined;
let shuttingDown = false;

// Retry the initial DB check with exponential backoff so a transient DB
// unavailability at boot doesn't hard-crash the process. If it never comes up,
// we still start listening — /api/health will report 503 and let a process
// manager / load balancer decide, which is more resilient than crash-looping.
async function connectWithRetry(attempts = 3, baseDelayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await checkDatabase();
      console.log("Database connection OK");
      return;
    } catch (err: any) {
      console.error(`DB connect attempt ${attempt}/${attempts} failed: ${err.message}`);
      if (attempt === attempts) {
        console.error(
          "Starting server without a confirmed DB connection; /api/health will report status."
        );
        return;
      }
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
}

// Close the HTTP server (stop accepting new requests), drain the pg pool, then
// exit. A hard timeout guarantees we don't hang forever on a stuck connection.
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  const forceTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out; forcing exit.");
    process.exit(exitCode || 1);
  }, 10000);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      console.log("HTTP server closed.");
    }
    await pool.end();
    console.log("Database pool closed.");
  } catch (err: any) {
    console.error("Error during shutdown:", err.message);
    exitCode = exitCode || 1;
  } finally {
    clearTimeout(forceTimer);
    process.exit(exitCode);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  void shutdown("uncaughtException", 1);
});

(async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const { default: express } = await import("express");
    app.use(express.static(distPath));
    // Express 4 wildcard (the Express 5 form "*all" only matched paths ending in "all").
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // DB connectivity check (with retry) runs out-of-band so it never delays the
    // server from listening; /api/health reports live status.
    void connectWithRetry();
  });
})();
