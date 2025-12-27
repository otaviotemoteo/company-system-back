import Fastify from "fastify";
import { corsPlugin } from "./plugins/cors";
import { jwtPlugin } from "./plugins/jwt";
import { swaggerPlugin } from "./plugins/swagger";
import { errorHandler } from "./shared/middlewares/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { projectsRoutes } from "./modules/projects/projects.routes";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  console.log("🚀 Iniciando aplicação...");

  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);
  app.setErrorHandler(errorHandler);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(usersRoutes, { prefix: "/api/users" });
  await app.register(projectsRoutes, { prefix: "/api/projects" });

  await app.ready();

  console.log("✅ Aplicação iniciada com sucesso!");

  return app;
}
