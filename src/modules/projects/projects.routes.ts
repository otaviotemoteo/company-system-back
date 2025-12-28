import { FastifyInstance } from "fastify";
import { ProjectsService } from "./projects.service";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from "./projects.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const projectsService = new ProjectsService();

export async function projectsRoutes(app: FastifyInstance) {
  // GET /projects - Listar projetos (filtrado por role)
  app.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar projetos (filtrado por permissão)",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Lista de projetos",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string" },
                priority: { type: "string" },
                budget: { type: "number" },
                managerId: { type: "string" },
                manager: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
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
        const user = (request as any).user;
        const projects = await projectsService.findAll(user.id, user.role);
        return reply.status(200).send(projects);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // GET /projects/:id - Buscar projeto por ID
  app.get(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Buscar projeto por ID",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Dados do projeto",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              budget: { type: "number" },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              deadline: { type: ["string", "null"] },
              managerId: { type: "string" },
              manager: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                },
              },
              members: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    projectId: { type: "string" },
                    role: { type: "string" },
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
              },
              phases: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              _count: {
                type: "object",
                properties: {
                  documents: { type: "number" },
                },
              },
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
        const { id } = request.params as any;
        const user = (request as any).user;
        const project = await projectsService.findById(id, user.id, user.role);
        return reply.status(200).send(project);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // POST /projects - Criar projeto (somente ADMIN)
  app.post(
    "/",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Criar novo projeto",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["title", "managerId"],
          properties: {
            title: { type: "string", minLength: 3 },
            description: { type: "string" },
            managerId: { type: "string" },
            priority: {
              type: "string",
              enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"],
            },
            budget: { type: "number" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            deadline: { type: "string", format: "date-time" },
          },
        },
        response: {
          201: {
            description: "Projeto criado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              budget: { type: "number" },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              deadline: { type: ["string", "null"] },
              managerId: { type: "string" },
              manager: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
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
        const data = createProjectSchema.parse(request.body);
        const project = await projectsService.create(data);
        return reply.status(201).send(project);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // PUT /projects/:id - Atualizar projeto (ADMIN ou GERENTE do projeto)
  app.put(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Atualizar projeto",
        tags: ["Projects"],
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
            managerId: { type: "string" },
            status: {
              type: "string",
              enum: [
                "PLANEJAMENTO",
                "EM_ANDAMENTO",
                "EM_PAUSA",
                "CONCLUIDO",
                "CANCELADO",
              ],
            },
            priority: {
              type: "string",
              enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"],
            },
            budget: { type: "number" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            deadline: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: {
            description: "Projeto atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              budget: { type: "number" },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              deadline: { type: ["string", "null"] },
              managerId: { type: "string" },
              manager: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
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
        const { id } = request.params as any;
        const user = (request as any).user;
        const data = updateProjectSchema.parse(request.body);
        const project = await projectsService.update(
          id,
          data,
          user.id,
          user.role
        );
        return reply.status(200).send(project);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // DELETE /projects/:id - Deletar projeto (somente ADMIN)
  app.delete(
    "/:id",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Deletar projeto",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Projeto deletado com sucesso",
            type: "object",
            properties: {
              message: { type: "string" },
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
        const { id } = request.params as any;
        const result = await projectsService.delete(id);
        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(404).send({ error: error.message });
      }
    }
  );

  // POST /projects/:id/members - Adicionar membro (ADMIN ou GERENTE do projeto)
  app.post(
    "/:id/members",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Adicionar membro ao projeto",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: { type: "string" },
            role: { type: "string" },
          },
        },
        response: {
          201: {
            description: "Membro adicionado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              projectId: { type: "string" },
              role: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                },
              },
              createdAt: { type: "string" },
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
        const { id } = request.params as any;
        const user = (request as any).user;
        const data = addMemberSchema.parse(request.body);
        const member = await projectsService.addMember(
          id,
          data,
          user.id,
          user.role
        );
        return reply.status(201).send(member);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // DELETE /projects/:id/members/:memberId - Remover membro
  app.delete(
    "/:id/members/:memberId",
    {
      preHandler: [authenticate, authorize(["ADMIN", "GERENTE"])],
      schema: {
        description: "Remover membro do projeto",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            memberId: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Membro removido com sucesso",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Erro",
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
        const { id, memberId } = request.params as any;
        const user = (request as any).user;
        const result = await projectsService.removeMember(
          id,
          memberId,
          user.id,
          user.role
        );
        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // GET /projects/:id/members - Listar membros
  app.get(
    "/:id/members",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar membros do projeto",
        tags: ["Projects"],
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
            description: "Lista de membros",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                userId: { type: "string" },
                projectId: { type: "string" },
                role: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                },
                createdAt: { type: "string" },
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
          400: {
            description: "Erro de requisição",
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
        const members = await projectsService.getMembers(
          id,
          user.id,
          user.role
        );
        return reply.status(200).send(members);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
}
