import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors";
import { jwtPlugin } from "./plugins/jwt";
import { swaggerPlugin } from "./plugins/swagger";
import { errorHandler } from "./shared/middlewares/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // plugins
  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);

  // global error handler
  app.setErrorHandler(errorHandler);

  // health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // routes
  await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
