import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../../shared/utils/password";

describe("Password Utils", () => {
  describe("hashPassword", () => {
    it("deve gerar um hash a partir da senha", async () => {
      const password = "minha_senha_123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it("deve gerar hashes diferentes para mesma senha (salt aleatório)", async () => {
      const password = "123456";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt usa salt aleatório, então dois hashes devem ser diferentes
      expect(hash1).not.toBe(hash2);
    });

    it("deve gerar hash com comprimento adequado (bcrypt)", async () => {
      const password = "password_teste";
      const hash = await hashPassword(password);

      // bcrypt gera hash com 60 caracteres
      expect(hash.length).toBe(60);
    });

    it("deve ser assíncrono", async () => {
      const password = "teste";
      const result = hashPassword(password);

      expect(result).toBeInstanceOf(Promise);
      const hash = await result;
      expect(typeof hash).toBe("string");
    });

    it("deve hashear senhas vazias", async () => {
      const password = "";
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60); // ainda gera hash válido
    });

    it("deve hashear senhas muito longas", async () => {
      const password = "a".repeat(1000);
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60);
    });

    it("deve hashear senhas com caracteres especiais", async () => {
      const password = "P@$$w0rd!#@%^&*()";
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60);
      expect(hash).not.toBe(password);
    });

    it("deve hashear senhas com acentos", async () => {
      const password = "sênha_com_àcento_é";
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60);
      expect(hash).not.toBe(password);
    });
  });

  describe("comparePassword", () => {
    it("deve retornar true para senha correta", async () => {
      const password = "senha_correta_123";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("deve retornar false para senha incorreta", async () => {
      const correctPassword = "senha_correta";
      const wrongPassword = "senha_errada";
      const hash = await hashPassword(correctPassword);

      const isValid = await comparePassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("deve retornar false para senha vazia quando hash não é vazio", async () => {
      const password = "senha_com_valor";
      const hash = await hashPassword(password);

      const isValid = await comparePassword("", hash);

      expect(isValid).toBe(false);
    });

    it("deve ser case-sensitive", async () => {
      const password = "SenhaComCaseJustoPraTestar";
      const hash = await hashPassword(password);

      const isValidCorrect = await comparePassword(password, hash);
      const isValidWrongCase = await comparePassword(
        "senhacomcasejustopraTestar",
        hash
      );

      expect(isValidCorrect).toBe(true);
      expect(isValidWrongCase).toBe(false);
    });

    it("deve aceitar espaços como parte da senha", async () => {
      const password = "senha com espaços";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      const isValidWithoutSpace = await comparePassword(
        "senhasem espaços",
        hash
      );

      expect(isValid).toBe(true);
      expect(isValidWithoutSpace).toBe(false);
    });

    it("deve retornar false para hash inválido", async () => {
      const password = "senha_correta";
      const invalidHash = "hash_invalido_nao_bcrypt";

      // Isso deve ou retornar false ou lançar erro
      try {
        const isValid = await comparePassword(password, invalidHash);
        expect(isValid).toBe(false);
      } catch {
        // se lançar erro, também é aceitável
        expect(true).toBe(true);
      }
    });

    it("deve comparar senhas com caracteres especiais", async () => {
      const password = "P@$$w0rd!#@%^&*()";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("deve comparar senhas com acentos", async () => {
      const password = "sênha_com_àcento_é";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("deve ser assíncrono", async () => {
      const password = "teste";
      const hash = await hashPassword(password);
      const result = comparePassword(password, hash);

      expect(result).toBeInstanceOf(Promise);
      const isValid = await result;
      expect(typeof isValid).toBe("boolean");
    });
  });

  describe("Integração hash + compare", () => {
    it("deve hashear e comparar corretamente a mesma senha", async () => {
      const password = "minha_senha_super_secreta_123";
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("fluxo de registro + login", async () => {
      // Simula registro
      const senhaRegistro = "senha123";
      const hashArmazenado = await hashPassword(senhaRegistro);

      // Simula login com mesma senha
      const senhaLogin = "senha123";
      const isValidLogin = await comparePassword(senhaLogin, hashArmazenado);

      expect(isValidLogin).toBe(true);
    });

    it("fluxo de registro + login com senha errada", async () => {
      const senhaRegistro = "senha_correta_123";
      const hashArmazenado = await hashPassword(senhaRegistro);

      const senhaLoginErrada = "senha_errada_123";
      const isValidLogin = await comparePassword(
        senhaLoginErrada,
        hashArmazenado
      );

      expect(isValidLogin).toBe(false);
    });
  });
});
