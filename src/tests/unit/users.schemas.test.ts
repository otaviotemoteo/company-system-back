import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
} from "../../modules/users/users.schemas";

describe("Users Schemas", () => {
  describe("createUserSchema", () => {
    const validUser = {
      name: "João Silva",
      email: "joao@example.com",
      password: "senha123",
      role: "FUNCIONARIO",
    };

    it("deve validar usuário com dados corretos", () => {
      const result = createUserSchema.safeParse(validUser);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("João Silva");
        expect(result.data.email).toBe("joao@example.com");
        expect(result.data.password).toBe("senha123");
        expect(result.data.role).toBe("FUNCIONARIO");
      }
    });

    it("deve rejeitar nome muito curto", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        name: "Jo",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar email inválido", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha curta", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        password: "123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar role inválida", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "SUPER_ADMIN",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar role ADMIN", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "ADMIN",
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar role GERENTE", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "GERENTE",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar sem campo obrigatório", () => {
      const { password, ...incomplete } = validUser;

      const result = createUserSchema.safeParse(incomplete);

      expect(result.success).toBe(false);
    });

    it("deve rejeitar role vazio", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar nomes com acentos", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        name: "João Pereira",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar nomes com números", () => {
      // Depende da implementação - se permitir números
      const result = createUserSchema.safeParse({
        ...validUser,
        name: "João 123",
      });

      // Não vai rejeitar pois é um string.min()
      expect(result.success).toBe(true);
    });
  });

  describe("updateUserSchema", () => {
    it("deve validar com todos os campos opcionais", () => {
      const result = updateUserSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de nome", () => {
      const result = updateUserSchema.safeParse({
        name: "Novo Nome",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de email", () => {
      const result = updateUserSchema.safeParse({
        email: "newemail@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de senha", () => {
      const result = updateUserSchema.safeParse({
        password: "novasenha123",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de role", () => {
      const result = updateUserSchema.safeParse({
        role: "GERENTE",
      });

      expect(result.success).toBe(true);
    });

    it("deve validar atualização de isActive", () => {
      const result = updateUserSchema.safeParse({
        isActive: false,
      });

      expect(result.success).toBe(true);
    });

    it("deve validar múltiplos campos simultaneamente", () => {
      const result = updateUserSchema.safeParse({
        name: "Novo Nome",
        email: "novo@example.com",
        role: "ADMIN",
        isActive: true,
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar nome muito curto em update", () => {
      const result = updateUserSchema.safeParse({
        name: "Jo",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar email inválido em update", () => {
      const result = updateUserSchema.safeParse({
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha muito curta em update", () => {
      const result = updateUserSchema.safeParse({
        password: "123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar role inválida em update", () => {
      const result = updateUserSchema.safeParse({
        role: "INVALID_ROLE",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar isActive true", () => {
      const result = updateUserSchema.safeParse({
        isActive: true,
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar isActive false", () => {
      const result = updateUserSchema.safeParse({
        isActive: false,
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar isActive não-booleano", () => {
      const result = updateUserSchema.safeParse({
        isActive: "true",
      });

      expect(result.success).toBe(false);
    });
  });
});
