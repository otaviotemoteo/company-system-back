import { FastifyInstance } from "fastify";
import { DocumentsService } from "./documents.service";
import { uploadDocumentSchema } from "./documents.schemas";
import { authenticate } from "../../shared/middlewares/authenticate";

const documentsService = new DocumentsService();

export async function documentsRoutes(app: FastifyInstance) {
  // GET /documents - Listar documentos
  app.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        description: "Listar documentos (filtrado por permissão)",
        tags: ["Documents"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            projectId: { type: "string" },
            phaseId: { type: "string" },
            taskId: { type: "string" },
            type: {
              type: "string",
              enum: [
                "CONTRATO",
                "ESPECIFICACAO",
                "RELATORIO",
                "ENTREGA",
                "OUTRO",
              ],
            },
          },
        },
        response: {
          200: {
            description: "Lista de documentos",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                fileUrl: { type: "string" },
                fileSize: { type: "number" },
                uploadedById: { type: "string" },
                projectId: { type: "string" },
                phaseId: { type: "string" },
                taskId: { type: "string" },
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
          404: {
            description: "Recurso não encontrado",
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

        const documents = await documentsService.findAll(
          user.id,
          user.role,
          filters
        );

        return reply.status(200).send(documents);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // GET /documents/:id - Buscar documento
  app.get(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Buscar documento por ID",
        tags: ["Documents"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Dados do documento",
            type: "object",
          },
          403: {
            description: "Sem permissão",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Documento não encontrado",
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
        const document = await documentsService.findById(
          id,
          user.id,
          user.role
        );
        return reply.status(200).send(document);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // POST /documents - Upload documento
  app.post(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        description: "Fazer upload de documento",
        tags: ["Documents"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "type", "fileUrl", "fileSize"],
          properties: {
            name: { type: "string", minLength: 3 },
            type: {
              type: "string",
              enum: [
                "CONTRATO",
                "ESPECIFICACAO",
                "RELATORIO",
                "ENTREGA",
                "OUTRO",
              ],
            },
            description: { type: "string" },
            projectId: { type: "string" },
            phaseId: { type: "string" },
            taskId: { type: "string" },
            fileUrl: { type: "string", format: "uri" },
            fileSize: { type: "number" },
          },
        },
        response: {
          201: {
            description: "Documento enviado com sucesso",
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              type: { type: "string" },
              fileUrl: { type: "string" },
              fileSize: { type: "number" },
              uploadedById: { type: "string" },
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
        const data = uploadDocumentSchema.parse(request.body);
        const document = await documentsService.upload(
          data,
          user.id,
          user.role
        );
        return reply.status(201).send(document);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // DELETE /documents/:id - Deletar documento
  app.delete(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        description: "Deletar documento",
        tags: ["Documents"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Documento deletado com sucesso",
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
            description: "Documento não encontrado",
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
        const result = await documentsService.delete(id, user.id, user.role);
        return reply.status(200).send(result);
      } catch (error: any) {
        const status = error.message.includes("permissão") ? 403 : 404;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
}
