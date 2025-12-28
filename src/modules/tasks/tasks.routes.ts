import { FastifyInstance } from "fastify";
import { TasksService } from "./tasks.service";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  registerHoursSchema,
} from "./tasks.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const tasksService = new TasksService();

export async function tasksRoutes(app: FastifyInstance) {
  // GET /tasks - Listar tarefas (filtrado por role)
  app.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar tarefas (filtrado por permissão e contexto)",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            phaseId: { type: "string" },
            projectId: { type: "string" },
            status: {
              type: "string",
              enum: [
                "PENDENTE",
                "EM_ANDAMENTO",
                "EM_REVISAO",
                "CONCLUIDA",
                "BLOQUEADA",
              ],
            },
            assignedToId: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Lista de tarefas",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string" },
                priority: { type: "string" },
                estimatedHours: { type: "number" },
                workedHours: { type: "number" },
                deadline: { type: "string" },
                phaseId: { type: "string" },
                assignedToId: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
          },
          500: {
            description: "Erro interno",
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
        const user = (request as any).user;
        const filters = request.query as any;
        const tasks = await tasksService.findAll(user.id, user.role, filters);
        return reply.status(200).send(tasks);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // GET /tasks/:id - Buscar tarefa por ID
  app.get(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Buscar tarefa por ID",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: {
            description: "Dados da tarefa",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              estimatedHours: { type: "number" },
              workedHours: { type: "number" },
              deadline: { type: ["string", "null"] },
              completedAt: { type: ["string", "null"] },
              phaseId: { type: "string" },
              assignedToId: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
              phase: { type: "object", additionalProperties: true },
              assignedTo: {
                type: ["object", "null"],
                additionalProperties: true,
              },
              comments: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              documents: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              _count: { type: "object", additionalProperties: true },
            },
            additionalProperties: true,
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Tarefa não encontrada",
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
        const user = (request as any).user;

        const task = await tasksService.findById(id, user.id, user.role);

        return reply.status(200).send(task);
      } catch (error: any) {
        console.error("Erro ao buscar tarefa:", error.message);
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // POST /tasks - Criar tarefa (ADMIN ou GERENTE do projeto)
  app.post(
    "/",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Criar nova tarefa (ADMIN ou GERENTE do projeto)",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["title", "phaseId"],
          properties: {
            title: { type: "string", minLength: 3 },
            description: { type: "string" },
            phaseId: { type: "string" },
            assignedToId: { type: "string" },
            priority: {
              type: "string",
              enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"],
            },
            estimatedHours: { type: "number" },
            deadline: { type: "string", format: "date-time" },
          },
        },
        response: {
          201: {
            description: "Tarefa criada com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              estimatedHours: { type: "number" },
              workedHours: { type: "number" },
              phaseId: { type: "string" },
              assignedToId: { type: "string" },
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
          403: {
            description: "Sem permissão",
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
        const user = (request as any).user;
        const data = createTaskSchema.parse(request.body);
        const task = await tasksService.create(data, user.id, user.role);
        return reply.status(201).send(task);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // PUT /tasks/:id - Atualizar tarefa (ADMIN ou GERENTE do projeto)
  app.put(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Atualizar tarefa (ADMIN ou GERENTE do projeto)",
        tags: ["Tasks"],
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
            title: { type: "string", minLength: 3 },
            description: { type: "string" },
            assignedToId: { type: "string" },
            priority: {
              type: "string",
              enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"],
            },
            estimatedHours: { type: "number" },
            deadline: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: {
            description: "Tarefa atualizada com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              estimatedHours: { type: "number" },
              assignedToId: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Tarefa não encontrada",
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
        const user = (request as any).user;
        const data = updateTaskSchema.parse(request.body);
        const task = await tasksService.update(id, data, user.id, user.role);
        return reply.status(200).send(task);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // PATCH /tasks/:id/status - Atualizar status (FUNCIONARIO atribuído, GERENTE ou ADMIN)
  app.patch(
    "/:id/status",
    {
      preHandler: [authenticate],
      schema: {
        description:
          "Atualizar status da tarefa (FUNCIONARIO atribuído, GERENTE ou ADMIN)",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: [
                "PENDENTE",
                "EM_ANDAMENTO",
                "EM_REVISAO",
                "CONCLUIDA",
                "BLOQUEADA",
              ],
            },
          },
        },
        response: {
          200: {
            description: "Status atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              status: { type: "string" },
              completedAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Tarefa não encontrada",
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
        const user = (request as any).user;
        const data = updateTaskStatusSchema.parse(request.body);
        const task = await tasksService.updateStatus(
          id,
          data,
          user.id,
          user.role
        );
        return reply.status(200).send(task);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // POST /tasks/:id/hours - Registrar horas trabalhadas
  app.post(
    "/:id/hours",
    {
      preHandler: [authenticate],
      schema: {
        description:
          "Registrar horas trabalhadas (apenas FUNCIONARIO atribuído)",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["hours"],
          properties: {
            hours: { type: "number" },
            description: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Horas registradas com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              workedHours: { type: "number" },
              estimatedHours: { type: "number" },
              updatedAt: { type: "string" },
            },
          },
          400: {
            description: "Dados inválidos",
            type: "object",
            properties: { error: { type: "string" } },
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: { error: { type: "string" } },
          },
          404: {
            description: "Tarefa não encontrada",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const user = (request as any).user;

      // Validação do Zod ANTES de qualquer coisa
      try {
        const data = registerHoursSchema.parse(request.body);
        const task = await tasksService.registerHours(
          id,
          data,
          user.id,
          user.role
        );
        return reply.status(200).send(task);
      } catch (error: any) {
        // Erro de validação Zod
        if (error.issues) {
          return reply.status(400).send({ error: error.issues[0].message });
        }

        // Tarefa não encontrada
        if (error.message.includes("não encontrada")) {
          return reply.status(404).send({ error: error.message });
        }

        // Sem permissão
        if (
          error.message.includes("permissão") ||
          error.message.includes("atribuído")
        ) {
          return reply.status(403).send({ error: error.message });
        }
      }
    }
  );

  // DELETE /tasks/:id - Deletar tarefa (ADMIN ou GERENTE do projeto)
  app.delete(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Deletar tarefa (ADMIN ou GERENTE do projeto)",
        tags: ["Tasks"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          204: {
            description: "Tarefa deletada com sucesso",
            type: "null",
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Tarefa não encontrada",
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
        const user = (request as any).user;
        await tasksService.delete(id, user.id, user.role);
        return reply.status(204).send(); // Retornar 204 sem body
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
}
