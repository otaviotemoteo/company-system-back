import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  phaseId: z.string().uuid("ID da fase inválido"),
  assignedToId: z.string().uuid("ID do usuário inválido").optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  estimatedHours: z.coerce
    .number()
    .positive("Horas estimadas devem ser positivas")
    .optional(),
  deadline: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres").optional(),
  description: z.string().optional(),
  assignedToId: z.string().uuid("ID do usuário inválido").optional().nullable(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  estimatedHours: z.coerce
    .number()
    .positive("Horas estimadas devem ser positivas")
    .optional(),
  deadline: z.string().datetime().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum([
    "PENDENTE",
    "EM_ANDAMENTO",
    "EM_REVISAO",
    "CONCLUIDA",
    "BLOQUEADA",
  ]),
});

export const registerHoursSchema = z.object({
  hours: z.coerce.number().positive("Horas devem ser positivas"),
  description: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type RegisterHoursInput = z.infer<typeof registerHoursSchema>;
