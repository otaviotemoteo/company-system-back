import { z } from "zod";

export const createPhaseSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  projectId: z.string().uuid("ID do projeto inválido"),
  order: z.number().int().positive("Ordem deve ser um número positivo"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updatePhaseSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  description: z.string().optional(),
  order: z
    .number()
    .int()
    .positive("Ordem deve ser um número positivo")
    .optional(),
  status: z
    .enum(["NAO_INICIADA", "EM_ANDAMENTO", "CONCLUIDA", "BLOQUEADA"])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
