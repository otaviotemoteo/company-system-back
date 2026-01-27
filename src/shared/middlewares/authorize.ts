import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../types";

export function authorize(roles: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const userRole = request.user.role;

    // Se não há roles especificadas, bloqueia todos (inclusive ADMIN)
    if (roles.length === 0) {
      return reply
        .status(403)
        .send({ error: "Sem permissão para acessar este recurso" });
    }

    // ADMIN tem acesso a qualquer rota (quando há roles especificadas)
    if (userRole === "ADMIN") {
      return;
    }

    // Para outros usuários, verifica se a role está na lista permitida (case-sensitive)
    if (!roles.includes(userRole)) {
      return reply
        .status(403)
        .send({ error: "Sem permissão para acessar este recurso" });
    }
  };
}
