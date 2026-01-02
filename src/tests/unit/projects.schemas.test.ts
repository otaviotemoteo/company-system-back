import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from "../../modules/projects/projects.schemas";

describe("Projects Schemas", () => {
  describe("createProjectSchema", () => {
    const validProject = {
      title: "Projeto de Exemplo",
      managerId: "550e8400-e29b-41d4-a716-446655440000",
    };

    it("deve validar projeto com dados obrigatórios", () => {
      const result = createProjectSchema.safeParse(validProject);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Projeto de Exemplo");
        expect(result.data.managerId).toBe(
          "550e8400-e29b-41d4-a716-446655440000"
        );
      }
    });

    it("deve validar projeto com description opcional", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        description: "Descrição do projeto",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar projeto com priority opcional", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        priority: "ALTA",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar todas as prioridades", () => {
      const priorities = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

      priorities.forEach((priority) => {
        const result = createProjectSchema.safeParse({
          ...validProject,
          priority,
        });

        expect(result.success).toBe(true);
      });
    });

    it("deve rejeitar priority inválida", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        priority: "ULTRA_URGENTE",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar título muito curto", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        title: "AB",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar managerId inválido (não UUID)", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        managerId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
    });

    it("deve validar budget positivo", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        budget: 10000.5,
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar budget zero", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        budget: 0,
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar budget negativo", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        budget: -1000,
      });

      expect(result.success).toBe(false);
    });

    it("deve validar datas em formato ISO", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar datas em formato inválido", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        startDate: "2025-01-01", // não é datetime
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateProjectSchema", () => {
    it("deve validar com objeto vazio", () => {
      const result = updateProjectSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de title", () => {
      const result = updateProjectSchema.safeParse({
        title: "Novo Título",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de status", () => {
      const statuses = [
        "PLANEJAMENTO",
        "EM_ANDAMENTO",
        "EM_PAUSA",
        "CONCLUIDO",
        "CANCELADO",
      ];

      statuses.forEach((status) => {
        const result = updateProjectSchema.safeParse({ status });

        expect(result.success).toBe(true);
      });
    });

    it("deve rejeitar status inválido", () => {
      const result = updateProjectSchema.safeParse({
        status: "INVALID_STATUS",
      });

      expect(result.success).toBe(false);
    });

    it("deve validar múltiplos campos opcionais", () => {
      const result = updateProjectSchema.safeParse({
        title: "Novo Título",
        status: "EM_ANDAMENTO",
        priority: "ALTA",
        budget: 50000,
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar managerId inválido (não UUID)", () => {
      const result = updateProjectSchema.safeParse({
        managerId: "not-a-uuid",
      });

      expect(result.success).toBe(false);
    });

    it("deve validar managerId em UUID válido", () => {
      const result = updateProjectSchema.safeParse({
        managerId: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("addMemberSchema", () => {
    it("deve validar adição de membro com dados corretos", () => {
      const result = addMemberSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "Desenvolvedor",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar userId inválido (não UUID)", () => {
      const result = addMemberSchema.safeParse({
        userId: "not-a-uuid",
        role: "Desenvolvedor",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar role muito curta", () => {
      const result = addMemberSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "D",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar role vazia", () => {
      const result = addMemberSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "",
      });

      expect(result.success).toBe(false);
    });

    it("deve validar diferentes roles", () => {
      const roles = ["Desenvolvedor", "Testador", "Designer", "Product Owner"];

      roles.forEach((role) => {
        const result = addMemberSchema.safeParse({
          userId: "550e8400-e29b-41d4-a716-446655440000",
          role,
        });

        expect(result.success).toBe(true);
      });
    });

    it("deve rejeitar sem campo userId", () => {
      const result = addMemberSchema.safeParse({
        role: "Desenvolvedor",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem campo role", () => {
      const result = addMemberSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(result.success).toBe(false);
    });
  });
});
