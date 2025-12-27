import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";

describe("Auth Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("POST /api/auth/register", () => {
    it("deve registrar um novo usuário", async () => {
      const response = await request(app.server)
        .post("/api/auth/register")
        .send({
          name: "John Doe",
          email: "john@example.com",
          password: "123456",
          role: "FUNCIONARIO",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("john@example.com");
      expect(response.body.user.role).toBe("FUNCIONARIO");
    });

    it("não deve registrar usuário com email duplicado", async () => {
      // Criar primeiro usuário
      await TestHelpers.createUser({ email: "duplicate@test.com" });

      // Tentar criar outro com mesmo email
      const response = await request(app.server)
        .post("/api/auth/register")
        .send({
          name: "Another User",
          email: "duplicate@test.com",
          password: "123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("já cadastrado");
    });

    it("não deve registrar usuário com dados inválidos", async () => {
      const response = await request(app.server)
        .post("/api/auth/register")
        .send({
          name: "Jo", // Muito curto
          email: "invalid-email", // Email inválido
          password: "123", // Senha muito curta
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("deve fazer login com credenciais válidas", async () => {
      // Criar usuário
      await TestHelpers.createUser({
        email: "login@test.com",
        password: "123456",
      });

      // Fazer login
      const response = await request(app.server).post("/api/auth/login").send({
        email: "login@test.com",
        password: "123456",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe("login@test.com");
    });

    it("não deve fazer login com senha incorreta", async () => {
      await TestHelpers.createUser({
        email: "wrong@test.com",
        password: "123456",
      });

      const response = await request(app.server).post("/api/auth/login").send({
        email: "wrong@test.com",
        password: "wrong-password",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("inválidos");
    });

    it("não deve fazer login com usuário inexistente", async () => {
      const response = await request(app.server).post("/api/auth/login").send({
        email: "nonexistent@test.com",
        password: "123456",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("deve retornar dados do usuário autenticado", async () => {
      const user = await TestHelpers.createUser();
      const token = TestHelpers.generateToken(app, user);

      const response = await request(app.server)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe(user.email);
    });

    it("não deve retornar dados sem token", async () => {
      const response = await request(app.server).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("não deve retornar dados com token inválido", async () => {
      const response = await request(app.server)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token-invalido");

      expect(response.status).toBe(401);
    });
  });
});
