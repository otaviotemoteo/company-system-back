import { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/env";

export async function jwtPlugin(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: "24h",
    },
  });

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Token inválido ou expirado" });
    }
  });
}
