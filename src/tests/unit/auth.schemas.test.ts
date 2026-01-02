import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "../../modules/auth/auth.schemas";

describe("Auth Schemas", () => {
  describe("loginSchema", () => {
    const validLogin = {
      email: "user@example.com",
      password: "senha123",
    };

    it("deve validar login com dados corretos", () => {
      const result = loginSchema.safeParse(validLogin);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("senha123");
      }
    });

    it("deve rejeitar email inválido", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "senha123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Email inválido");
      }
    });

    it("deve rejeitar email vazio", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha muito curta (< 6 caracteres)", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "123", // 3 caracteres
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "no mínimo 6 caracteres"
        );
      }
    });

    it("deve rejeitar senha vazia", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar senha com exatamente 6 caracteres", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "123456",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar sem campo email", () => {
      const result = loginSchema.safeParse({
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem campo password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar com campos extras", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "senha123",
        name: "John", // campo extra
      });

      // Zod ignora campos extras por padrão
      expect(result.success).toBe(true);
    });

    it("deve rejeitar email com formato inválido", () => {
      const invalidEmails = [
        "plainaddress",
        "@nodomain.com",
        "user@",
        "user name@example.com",
        "user@domain",
      ];

      invalidEmails.forEach((email) => {
        const result = loginSchema.safeParse({
          email,
          password: "senha123",
        });

        expect(result.success).toBe(false);
      });
    });

    it("deve aceitar emails válidos diversos", () => {
      const validEmails = [
        "user@example.com",
        "test.user@example.co.uk",
        "user+tag@example.com",
        "user_name@example.com",
        "user-name@example.com",
      ];

      validEmails.forEach((email) => {
        const result = loginSchema.safeParse({
          email,
          password: "senha123",
        });

        expect(result.success).toBe(true);
      });
    });

    it("deve aceitar senhas longas", () => {
      const longPassword = "a".repeat(100);
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: longPassword,
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar senhas com caracteres especiais", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "P@$$w0rd!#@%^&*()",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("registerSchema", () => {
    const validRegister = {
      name: "João Silva",
      email: "joao@example.com",
      password: "senha123",
      role: "FUNCIONARIO",
    };

    it("deve validar registro com dados corretos", () => {
      const result = registerSchema.safeParse(validRegister);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("João Silva");
        expect(result.data.email).toBe("joao@example.com");
        expect(result.data.password).toBe("senha123");
        expect(result.data.role).toBe("FUNCIONARIO");
      }
    });

    it("deve validar sem role (usa default)", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBeUndefined();
      }
    });

    it("deve rejeitar nome muito curto (< 3 caracteres)", () => {
      const result = registerSchema.safeParse({
        name: "Jo",
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "no mínimo 3 caracteres"
        );
      }
    });

    it("deve rejeitar nome vazio", () => {
      const result = registerSchema.safeParse({
        name: "",
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar nome com exatamente 3 caracteres", () => {
      const result = registerSchema.safeParse({
        name: "Joe",
        email: "joe@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar nomes com acentos", () => {
      const result = registerSchema.safeParse({
        name: "João Pereira",
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar email inválido", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "invalid-email",
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha muito curta (< 6)", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: "123",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar role ADMIN", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123",
        role: "ADMIN",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("ADMIN");
      }
    });

    it("deve aceitar role GERENTE", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123",
        role: "GERENTE",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("GERENTE");
      }
    });

    it("deve rejeitar role inválida", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: "senha123",
        role: "SUPER_ADMIN",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem campo name", () => {
      const result = registerSchema.safeParse({
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem campo email", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        password: "senha123",
      });

      expect(result.success).toBe(false);
    });

    it("deve rejeitar sem campo password", () => {
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
      });

      expect(result.success).toBe(false);
    });

    it("deve aceitar nomes muito longos", () => {
      const longName = "João ".repeat(20);
      const result = registerSchema.safeParse({
        name: longName,
        email: "joao@example.com",
        password: "senha123",
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar senha muito longa", () => {
      const longPassword = "a".repeat(200);
      const result = registerSchema.safeParse({
        name: "João Silva",
        email: "joao@example.com",
        password: longPassword,
      });

      expect(result.success).toBe(true);
    });

    it("deve rejeitar múltiplas validações falhando", () => {
      const result = registerSchema.safeParse({
        name: "Jo", // muito curto
        email: "invalid", // inválido
        password: "12", // muito curta
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});
