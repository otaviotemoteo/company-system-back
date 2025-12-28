import { FastifyInstance } from "fastify";
import { PhasesService } from "./phases.service";
import { createPhaseSchema, updatePhaseSchema } from "./phases.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const phasesService = new PhasesService();

export async function phasesRoutes(app: FastifyInstance) {
  // GET /phases/project/:projectId - Listar fases de um projeto
  app.get(
    "/project/:projectId",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar fases de um projeto (ordenadas)",
        tags: ["Phases"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Lista de fases",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                order: { type: "number" },
                status: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                projectId: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
                _count: {
                  type: "object",
                  properties: {
                    tasks: { type: "number" },
                    documents: { type: "number" },
                  },
                },
              },
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
            description: "Projeto não encontrado",
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
        const { projectId } = request.params as any;
        const user = (request as any).user;
        const phases = await phasesService.findByProject(
          projectId,
          user.id,
          user.role
        );
        return reply.status(200).send(phases);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // GET /phases/:id - Buscar fase por ID
  app.get(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Buscar fase por ID",
        tags: ["Phases"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Dados da fase",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              order: { type: "number" },
              status: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              projectId: { type: "string" },
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
            description: "Fase não encontrada",
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
        const phase = await phasesService.findById(id, user.id, user.role);
        return reply.status(200).send(phase);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // POST /phases - Criar nova fase
  app.post(
    "/",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Criar nova fase (ADMIN ou GERENTE do projeto)",
        tags: ["Phases"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "projectId", "order"],
          properties: {
            name: { type: "string", minLength: 3 },
            description: { type: "string" },
            projectId: { type: "string" },
            order: { type: "number" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
        response: {
          201: {
            description: "Fase criada com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              order: { type: "number" },
              status: { type: "string" },
              projectId: { type: "string" },
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
        const data = createPhaseSchema.parse(request.body);
        const phase = await phasesService.create(data, user.id, user.role);
        return reply.status(201).send(phase);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // PUT /phases/:id - Atualizar fase
  app.put(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Atualizar fase (ADMIN ou GERENTE do projeto)",
        tags: ["Phases"],
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
            description: { type: "string" },
            order: { type: "number" },
            status: {
              type: "string",
              enum: ["NAO_INICIADA", "EM_ANDAMENTO", "CONCLUIDA", "BLOQUEADA"],
            },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: {
            description: "Fase atualizada com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              order: { type: "number" },
              status: { type: "string" },
              projectId: { type: "string" },
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
            description: "Fase não encontrada",
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
        const data = updatePhaseSchema.parse(request.body);
        const phase = await phasesService.update(id, data, user.id, user.role);
        return reply.status(200).send(phase);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // DELETE /phases/:id - Deletar fase
  app.delete(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Deletar fase (ADMIN ou GERENTE do projeto)",
        tags: ["Phases"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Fase deletada com sucesso",
            type: "object",
            properties: {
              message: { type: "string" },
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
            description: "Fase não encontrada",
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
        const result = await phasesService.delete(id, user.id, user.role);
        return reply.status(200).send(result);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // PUT /phases/project/:projectId/reorder - Reordenar fases
  app.put(
    "/project/:projectId/reorder",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description:
          "Reordenar fases de um projeto (ADMIN ou GERENTE do projeto)",
        tags: ["Phases"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["phases"],
          properties: {
            phases: {
              type: "array",
              items: {
                type: "object",
                required: ["phaseId", "order"],
                properties: {
                  phaseId: { type: "string" },
                  order: { type: "number" },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: "Fases reordenadas com sucesso",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                order: { type: "number" },
                projectId: { type: "string" },
              },
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
            description: "Projeto não encontrado",
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
        const { projectId } = request.params as any;
        const { phases } = request.body as any;
        const user = (request as any).user;
        const reorderedPhases = await phasesService.reorder(
          projectId,
          phases,
          user.id,
          user.role
        );
        return reply.status(200).send(reorderedPhases);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
}
