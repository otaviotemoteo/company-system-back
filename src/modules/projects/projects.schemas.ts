import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  managerId: z.string().uuid("ID do gerente inválido"),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  budget: z.number().positive("Orçamento deve ser positivo").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres").optional(),
  description: z.string().optional(),
  managerId: z.string().uuid("ID do gerente inválido").optional(),
  status: z
    .enum([
      "PLANEJAMENTO",
      "EM_ANDAMENTO",
      "EM_PAUSA",
      "CONCLUIDO",
      "CANCELADO",
    ])
    .optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  budget: z.number().positive("Orçamento deve ser positivo").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid("ID do usuário inválido"),
  role: z.string().min(2, "Função deve ter no mínimo 2 caracteres"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
