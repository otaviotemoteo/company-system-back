import { z } from "zod";

export const uploadDocumentSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  type: z.enum(["CONTRATO", "ESPECIFICACAO", "RELATORIO", "ENTREGA", "OUTRO"]),
  description: z.string().optional(),
  projectId: z.string().uuid("ID do projeto inválido").optional(),
  phaseId: z.string().uuid("ID da fase inválida").optional(),
  taskId: z.string().uuid("ID da tarefa inválida").optional(),
  fileUrl: z.string().url("URL do arquivo inválida"),
  fileSize: z.coerce.number().positive("Tamanho deve ser positivo"),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
