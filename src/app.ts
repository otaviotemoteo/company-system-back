import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors";
import { jwtPlugin } from "./plugins/jwt";
import { swaggerPlugin } from "./plugins/swagger";
import { errorHandler } from "./shared/middlewares/error-handler";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // routes
  // await app.register(authRoutes, { prefix: '/api/auth' });

  return app;
}
