import { buildApp } from "./app";
import { env } from "./config/env";

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📚 Docs available at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

start();
