import { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function swaggerPlugin(app: FastifyInstance) {
  app.register(fastifySwagger, {
    swagger: {
      info: {
        title: "Project Manager API",
        description: "API para gerenciamento de projetos",
        version: "1.0.0",
      },
    },
  });

  app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });
}
