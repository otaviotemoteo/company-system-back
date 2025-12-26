import { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";

export async function corsPlugin(app: FastifyInstance) {
  app.register(fastifyCors, {
    origin: true, // change when in production
    credentials: true,
  });
}
