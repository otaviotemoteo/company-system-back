import { FastifyInstance } from "fastify";
import { DashboardService } from "./dashboard.service";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const dashboardService = new DashboardService();

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /dashboard/admin - Dashboard do ADMIN
  app.get(
    "/admin",
    {
      preHandler: [authenticate, authorize(["ADMIN"])],
      schema: {
        description: "Dashboard com visão geral do sistema (apenas ADMIN)",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Métricas gerais do sistema",
            type: "object",
            properties: {
              totalUsuarios: { type: "number" },
              totalProjetos: { type: "number" },
              totalTarefas: { type: "number" },
              totalDocumentos: { type: "number" },
              usuariosPorRole: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
              projetosPorStatus: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
              tarefasPorStatus: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
              projetosRecentes: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              tarefasAtrasadas: { type: "number" },
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
        const dashboard = await dashboardService.getAdminDashboard();
        return reply.status(200).send(dashboard);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    },
  );

  // GET /dashboard/gerente - Dashboard do GERENTE
  app.get(
    "/gerente",
    {
      preHandler: [authenticate, authorize(["GERENTE"])],
      schema: {
        description: "Dashboard com métricas dos projetos do gerente",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Métricas dos projetos do gerente",
            type: "object",
            properties: {
              totalProjetos: { type: "number" },
              totalTarefas: { type: "number" },
              totalMembros: { type: "number" },
              projetosPorStatus: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
              tarefasPorStatus: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
              tarefasAtrasadas: { type: "number" },
              horasTrabalhadas: { type: "number" },
              horasEstimadas: { type: "number" },
              proximosDeadlines: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              meusProjetosRecentes: {
                type: "array",
                items: {
                  type: "object",
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
        const dashboard = await dashboardService.getGerenteDashboard(user.id);
        return reply.status(200).send(dashboard);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    },
  );

  // GET /dashboard/funcionario - Dashboard do FUNCIONARIO
  app.get(
    "/funcionario",
    {
      preHandler: [authenticate, authorize(["FUNCIONARIO"])],
      schema: {
        description: "Dashboard com métricas das tarefas do funcionário",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Métricas das tarefas do funcionário",
            type: "object",
            properties: {
              minhasTarefas: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  pendentes: { type: "number" },
                  emAndamento: { type: "number" },
                  emRevisao: { type: "number" },
                  concluidas: { type: "number" },
                  bloqueadas: { type: "number" },
                },
              },
              tarefasAtrasadas: { type: "number" },
              horasTrabalhadas: { type: "number" },
              horasEstimadas: { type: "number" },
              proximosDeadlines: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              tarefasRecentes: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              projetosOndeEMembro: {
                type: "array",
                items: {
                  type: "object",
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
        const dashboard = await dashboardService.getFuncionarioDashboard(
          user.id,
        );
        return reply.status(200).send(dashboard);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    },
  );
}
