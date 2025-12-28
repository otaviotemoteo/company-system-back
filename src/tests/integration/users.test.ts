import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import { TestHelpers } from "../helpers/test-helpers";
import { prisma } from "../../config/database";

describe("Users Routes", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let gerenteToken: string;
  let funcionarioToken: string;
  let adminUser: any;
  let gerenteUser: any;
  let funcionarioUser: any;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Limpar banco antes de cada teste
    await TestHelpers.clearDatabase();

    // Criar usuários de teste
    adminUser = await TestHelpers.createUser({
      name: "Admin User",
      email: "admin@test.com",
      password: "123456",
      role: "ADMIN",
    });

    gerenteUser = await TestHelpers.createUser({
      name: "Gerente User",
      email: "gerente@test.com",
      password: "123456",
      role: "GERENTE",
    });

    funcionarioUser = await TestHelpers.createUser({
      name: "Funcionario User",
      email: "funcionario@test.com",
      password: "123456",
      role: "FUNCIONARIO",
    });

    // Gerar tokens
    adminToken = TestHelpers.generateToken(app, adminUser);
    gerenteToken = TestHelpers.generateToken(app, gerenteUser);
    funcionarioToken = TestHelpers.generateToken(app, funcionarioUser);
  });

  afterAll(async () => {
    await TestHelpers.clearDatabase();
    await app.close();
  });

  describe("GET /api/users - Listar usuários", () => {
    it("ADMIN deve conseguir listar todos os usuários", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const users = JSON.parse(response.body);
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(3); // Pelo menos os 3 usuários criados
      expect(users[0]).toHaveProperty("id");
      expect(users[0]).toHaveProperty("name");
      expect(users[0]).toHaveProperty("email");
      expect(users[0]).toHaveProperty("role");
      expect(users[0]).not.toHaveProperty("password"); // Não deve retornar senha
    });

    it("ADMIN deve conseguir filtrar usuários por role", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users?role=GERENTE",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const users = JSON.parse(response.body);
      expect(users.every((u: any) => u.role === "GERENTE")).toBe(true);
    });

    it("ADMIN deve conseguir filtrar usuários por isActive", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users?isActive=true",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const users = JSON.parse(response.body);
      expect(users.every((u: any) => u.isActive === true)).toBe(true);
    });

    it("GERENTE não deve conseguir listar usuários", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${gerenteToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir listar usuários", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${funcionarioToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("não deve listar usuários sem autenticação", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/users/:id - Buscar usuário por ID", () => {
    it("ADMIN deve conseguir buscar qualquer usuário", async () => {
      // Criar um usuário específico para este teste
      const testUser = await TestHelpers.createUser({
        name: "Test User for Get",
        email: `gettest_${Date.now()}@test.com`,
        password: "123456",
        role: "GERENTE",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${testUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.body);
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
      expect(user).not.toHaveProperty("password");
    });

    it("GERENTE não deve conseguir buscar usuário", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/users/${funcionarioUser.id}`,
        headers: {
          authorization: `Bearer ${gerenteToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir buscar usuário", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/users/${gerenteUser.id}`,
        headers: {
          authorization: `Bearer ${funcionarioToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("não deve encontrar usuário com ID inválido", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/invalid-id-123456",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/users - Criar usuário", () => {
    it("ADMIN deve conseguir criar novo usuário", async () => {
      const newUser = {
        name: "New User Test",
        email: `newuser_${Date.now()}@test.com`,
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: newUser,
      });

      expect(response.statusCode).toBe(201);
      const user = JSON.parse(response.body);
      expect(user.name).toBe(newUser.name);
      expect(user.email).toBe(newUser.email);
      expect(user.role).toBe(newUser.role);
      expect(user.isActive).toBe(true);
      expect(user).not.toHaveProperty("password");
    });

    it("ADMIN deve conseguir criar usuário GERENTE", async () => {
      const newUser = {
        name: "New Manager",
        email: `manager_${Date.now()}@test.com`,
        password: "senha123",
        role: "GERENTE",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: newUser,
      });

      expect(response.statusCode).toBe(201);
      const user = JSON.parse(response.body);
      expect(user.role).toBe("GERENTE");
    });

    it("ADMIN deve conseguir criar usuário ADMIN", async () => {
      const newUser = {
        name: "New Admin",
        email: `admin_${Date.now()}@test.com`,
        password: "senha123",
        role: "ADMIN",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: newUser,
      });

      expect(response.statusCode).toBe(201);
      const user = JSON.parse(response.body);
      expect(user.role).toBe("ADMIN");
    });

    it("não deve criar usuário com email duplicado", async () => {
      // Primeiro criar um usuário
      const firstUser = await TestHelpers.createUser({
        name: "First User",
        email: `duplicate_${Date.now()}@test.com`,
        password: "123456",
        role: "FUNCIONARIO",
      });

      // Tentar criar outro com o mesmo email
      const duplicateUser = {
        name: "Duplicate User",
        email: firstUser.email, // Email já existente
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: duplicateUser,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.body);
      expect(error.error).toContain("Email já cadastrado");
    });

    it("não deve criar usuário com nome muito curto", async () => {
      const invalidUser = {
        name: "AB", // Nome com menos de 3 caracteres
        email: `short_${Date.now()}@test.com`,
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve criar usuário com email inválido", async () => {
      const invalidUser = {
        name: "Test User",
        email: "invalid-email", // Email inválido
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve criar usuário com senha muito curta", async () => {
      const invalidUser = {
        name: "Test User",
        email: `test_${Date.now()}@test.com`,
        password: "12345", // Senha com menos de 6 caracteres
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve criar usuário com role inválida", async () => {
      const invalidUser = {
        name: "Test User",
        email: `test_${Date.now()}@test.com`,
        password: "senha123",
        role: "INVALID_ROLE",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve criar usuário sem campos obrigatórios", async () => {
      const invalidUser = {
        name: "Test User",
        // Faltando email, password e role
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
    });

    it("GERENTE não deve conseguir criar usuário", async () => {
      const newUser = {
        name: "New User",
        email: `test_${Date.now()}@test.com`,
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${gerenteToken}`,
        },
        payload: newUser,
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir criar usuário", async () => {
      const newUser = {
        name: "New User",
        email: `test_${Date.now()}@test.com`,
        password: "senha123",
        role: "FUNCIONARIO",
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: `Bearer ${funcionarioToken}`,
        },
        payload: newUser,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PUT /api/users/:id - Atualizar usuário", () => {
    let userToUpdate: any;

    beforeEach(async () => {
      userToUpdate = await TestHelpers.createUser({
        name: "User to Update",
        email: `update_${Date.now()}@test.com`,
        password: "123456",
        role: "FUNCIONARIO",
      });
    });

    it("ADMIN deve conseguir atualizar qualquer usuário", async () => {
      const updateData = {
        name: "Updated Name",
        role: "GERENTE",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.body);
      expect(user.name).toBe(updateData.name);
      expect(user.role).toBe(updateData.role);
    });

    it("ADMIN deve conseguir atualizar email do usuário", async () => {
      const newEmail = `newemail_${Date.now()}@test.com`;
      const updateData = {
        email: newEmail,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.body);
      expect(user.email).toBe(newEmail);
    });

    it("ADMIN deve conseguir atualizar senha do usuário", async () => {
      const updateData = {
        password: "newpassword123",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      // Verificar que a senha não é retornada
      const user = JSON.parse(response.body);
      expect(user).not.toHaveProperty("password");
    });

    it("ADMIN deve conseguir desativar usuário", async () => {
      const updateData = {
        isActive: false,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.body);
      expect(user.isActive).toBe(false);
    });

    it("não deve atualizar usuário com email duplicado", async () => {
      // Criar usuário que será atualizado
      const userToChange = await TestHelpers.createUser({
        name: "User to Change",
        email: `tochange_${Date.now()}@test.com`,
        password: "123456",
        role: "FUNCIONARIO",
      });

      // Criar outro usuário para gerar conflito de email
      const anotherUser = await TestHelpers.createUser({
        name: "Another User",
        email: `another_${Date.now()}@test.com`,
        password: "123456",
        role: "FUNCIONARIO",
      });

      const updateData = {
        email: anotherUser.email, // Email já existente
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToChange.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.body);
      expect(error.error).toContain("Email já cadastrado");
    });

    it("não deve atualizar usuário com dados inválidos", async () => {
      const updateData = {
        name: "AB", // Nome muito curto
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve atualizar usuário inexistente", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/invalid-id-123456",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });

    it("GERENTE não deve conseguir atualizar usuário", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${gerenteToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir atualizar usuário", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${userToUpdate.id}`,
        headers: {
          authorization: `Bearer ${funcionarioToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/users/:id - Desativar usuário", () => {
    let userToDelete: any;

    beforeEach(async () => {
      userToDelete = await TestHelpers.createUser({
        name: "User to Delete",
        email: `delete_${Date.now()}@test.com`,
        password: "123456",
        role: "FUNCIONARIO",
      });
    });

    it("ADMIN deve conseguir desativar usuário", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${userToDelete.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.message).toContain("desativado com sucesso");

      // Verificar que o usuário foi desativado (soft delete)
      const user = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(user?.isActive).toBe(false);
      expect(user?.deletedAt).not.toBeNull();
    });

    it("não deve desativar usuário inexistente", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/invalid-id-123456",
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("GERENTE não deve conseguir desativar usuário", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${userToDelete.id}`,
        headers: {
          authorization: `Bearer ${gerenteToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir desativar usuário", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${userToDelete.id}`,
        headers: {
          authorization: `Bearer ${funcionarioToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
