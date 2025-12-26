import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../types";

export function authorize(roles: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const userRole = request.user.role;

    if (!roles.includes(userRole)) {
      return reply
        .status(403)
        .send({ error: "Sem permissão para acessar este recurso" });
    }
  };
}
