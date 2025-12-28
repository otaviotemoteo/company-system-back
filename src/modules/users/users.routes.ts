import { FastifyInstance } from "fastify";
import { UsersService } from "./users.service";
import { createUserSchema, updateUserSchema } from "./users.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const usersService = new UsersService();

export async function usersRoutes(app: FastifyInstance) {
  // GET /users - Listar todos os usuários (somente ADMIN)
  app.get(
    "/",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Listar todos os usuários",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
            isActive: { type: "boolean" },
          },
        },
        response: {
          200: {
            description: "Lista de usuários",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                isActive: { type: "boolean" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
          },
          500: {
            description: "Erro do servidor",
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
        const { role, isActive } = request.query as any;
        const users = await usersService.findAll({ role, isActive });
        return reply.status(200).send(users);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // GET /users/:id - Buscar usuário por ID (somente ADMIN)
  app.get(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Buscar usuário por ID",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
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
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const { id } = request.params as any;
        const user = await usersService.findById(id);
        return reply.status(200).send(user);
      } catch (error: any) {
        return reply.status(404).send({ error: error.message });
      }
    }
  );

  // POST /users - Criar novo usuário (somente ADMIN)
  app.post(
    "/",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Criar novo usuário",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: { type: "string", minLength: 3 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            role: { type: "string", enum: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
          },
        },
        response: {
          201: {
            description: "Usuário criado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              isActive: { type: "boolean" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
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
        const data = createUserSchema.parse(request.body);
        const user = await usersService.create(data);
        return reply.status(201).send(user);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // PUT /users/:id - Atualizar usuário (somente ADMIN)
  app.put(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Atualizar usuário",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 3 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            role: { type: "string", enum: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
            isActive: { type: "boolean" },
          },
        },
        response: {
          200: {
            description: "Usuário atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              isActive: { type: "boolean" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          400: {
            description: "Erro de validação",
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
          500: {
            description: "Erro interno do servidor",
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
        const { id } = request.params as any;
        const data = updateUserSchema.parse(request.body);
        const user = await usersService.update(id, data);
        return reply.status(200).send(user);
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({ error: error.message });
        }
        if (error.message.includes("Email já cadastrado")) {
          return reply.status(400).send({ error: error.message });
        }
        if (error.message.includes("Usuário não encontrado")) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // DELETE /users/:id - Desativar usuário (somente ADMIN)
  app.delete(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Desativar usuário",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Usuário desativado com sucesso",
            type: "object",
            properties: {
              message: { type: "string" },
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
        const { id } = request.params as any;
        const result = await usersService.delete(id);
        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(404).send({ error: error.message });
      }
    }
  );
}
