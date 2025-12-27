import { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyPlugin from "fastify-plugin";

async function corsPluginFunction(app: FastifyInstance) {
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });
}

export const corsPlugin = fastifyPlugin(corsPluginFunction);
