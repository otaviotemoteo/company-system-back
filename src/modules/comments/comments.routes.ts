import { FastifyInstance } from "fastify";
import { CommentsService } from "./comments.service";
import { createCommentSchema, updateCommentSchema } from "./comments.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";

const commentsService = new CommentsService();

export async function commentsRoutes(app: FastifyInstance) {
  // GET /comments/task/:taskId - Listar comentários de uma tarefa
  app.get(
    "/task/:taskId",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar comentários de uma tarefa",
        tags: ["Comments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Lista de comentários",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                content: { type: "string" },
                authorId: { type: "string" },
                author: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                },
                taskId: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
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
        const { taskId } = request.params as any;
        const user = (request as any).user;
        const comments = await commentsService.findByTask(
          taskId,
          user.id,
          user.role,
        );
        return reply.status(200).send(comments);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    },
  );

  // POST /comments - Criar comentário
  app.post(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        description: "Criar comentário em uma tarefa",
        tags: ["Comments"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["content", "taskId"],
          properties: {
            content: { type: "string", minLength: 1, maxLength: 1000 },
            taskId: { type: "string" },
          },
        },
        response: {
          201: {
            description: "Comentário criado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "string" },
              authorId: { type: "string" },
              author: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
              taskId: { type: "string" },
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
        const data = createCommentSchema.parse(request.body);
        const comment = await commentsService.create(data, user.id, user.role);
        return reply.status(201).send(comment);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 400;
        return reply.status(status).send({ error: error.message });
      }
    },
  );

  // PUT /comments/:id - Atualizar comentário
  app.put(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Atualizar comentário (apenas autor)",
        tags: ["Comments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["content"],
          properties: {
            content: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
        response: {
          200: {
            description: "Comentário atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "string" },
              authorId: { type: "string" },
              taskId: { type: "string" },
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
            description: "Comentário não encontrado",
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
        const data = updateCommentSchema.parse(request.body);
        const comment = await commentsService.update(id, data, user.id);
        return reply.status(200).send(comment);
      } catch (error: any) {
        const status =
          error.message.includes("autor") || error.message.includes("permissão")
            ? 403
            : 404;
        return reply.status(status).send({ error: error.message });
      }
    },
  );

  // DELETE /comments/:id - Deletar comentário
  app.delete(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Deletar comentário (autor ou ADMIN)",
        tags: ["Comments"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Comentário deletado com sucesso",
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
            description: "Comentário não encontrado",
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
        const result = await commentsService.delete(id, user.id, user.role);
        return reply.status(200).send(result);
      } catch (error: any) {
        const status =
          error.message.includes("autor") || error.message.includes("ADMIN")
            ? 403
            : 404;
        return reply.status(status).send({ error: error.message });
      }
    },
  );
}
