import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  console.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: "Erro de validação",
      details: error.validation,
    });
  }

  return reply.status(error.statusCode || 500).send({
    error: error.message || "Erro interno do servidor",
  });
}
