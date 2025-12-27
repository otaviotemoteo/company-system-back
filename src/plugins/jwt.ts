import { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyPlugin from "fastify-plugin";
import { env } from "../config/env";

async function jwtPluginFunction(app: FastifyInstance) {
  console.log("🔐 Registrando JWT plugin...");
  console.log("JWT_SECRET:", env.JWT_SECRET ? "Definido ✅" : "INDEFINIDO ❌");

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: "24h",
    },
  });

  console.log("✅ JWT plugin registrado!");

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Token inválido ou expirado" });
    }
  });
}

export const jwtPlugin = fastifyPlugin(jwtPluginFunction);
