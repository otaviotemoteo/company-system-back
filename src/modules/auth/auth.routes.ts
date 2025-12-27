import { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";

const authService = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post(
    "/register",
    {
      schema: {
        description: "Registrar novo usuário",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", minLength: 3 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            role: {
              type: "string",
              enum: ["ADMIN", "GERENTE", "FUNCIONARIO"],
            },
          },
        },
        response: {
          201: {
            description: "Usuário criado com sucesso",
            type: "object",
            properties: {
              token: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
          },
          400: {
            description: "Erro de validação",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const data = registerSchema.parse(request.body);
        const result = await authService.register(data);

        const token = app.jwt.sign({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        });

        return reply.status(201).send({
          token,
          user: result.user,
        });
      } catch (error: any) {
        return reply.status(400).send({
          error: error.message || "Erro ao registrar usuário",
        });
      }
    }
  );

  // POST /auth/login
  app.post(
    "/login",
    {
      schema: {
        description: "Fazer login no sistema",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        response: {
          200: {
            description: "Login realizado com sucesso",
            type: "object",
            properties: {
              token: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
          },
          401: {
            description: "Credenciais inválidas",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const data = loginSchema.parse(request.body);
        const result = await authService.login(data);

        const token = app.jwt.sign({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        });

        return reply.status(200).send({
          token,
          user: result.user,
        });
      } catch (error: any) {
        return reply.status(401).send({
          error: error.message || "Email ou senha inválidos",
        });
      }
    }
  );

  // GET /auth/me
  app.get(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        description: "Obter dados do usuário logado",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Dados do usuário",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              isActive: { type: "boolean" },
            },
          },
          401: {
            description: "Token inválido",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Usuário não encontrado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.id;
        const user = await authService.getUserById(userId);

        return reply.status(200).send(user);
      } catch (error: any) {
        return reply.status(404).send({
          error: error.message || "Usuário não encontrado",
        });
      }
    }
  );
}
