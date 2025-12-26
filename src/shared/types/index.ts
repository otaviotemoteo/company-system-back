import { FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export * from "./enums";
