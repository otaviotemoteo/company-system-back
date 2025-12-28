import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import { TestHelpers } from "../helpers/test-helpers";

describe("Projects Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Limpar banco antes de cada teste
    await TestHelpers.clearDatabase();
  });

  afterAll(async () => {
    await TestHelpers.clearDatabase();
    await app.close();
  });

  describe("POST /api/projects - Criar projeto", () => {
    it("ADMIN deve conseguir criar projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Projeto Teste",
          description: "Descrição do projeto",
          managerId: gerente.id,
          priority: "ALTA",
          budget: 50000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("id");
      expect(body.title).toBe("Projeto Teste");
      expect(body.managerId).toBe(gerente.id);
      expect(body.priority).toBe("ALTA");
    });

    it("GERENTE não deve conseguir criar projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Projeto Teste",
          managerId: gerente.id,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("permissão");
    });

    it("FUNCIONARIO não deve conseguir criar projeto", async () => {
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Projeto Teste",
          managerId: funcionario.id,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("não deve criar projeto sem gerente válido", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Projeto Teste",
          managerId: "id-invalido",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("não deve criar projeto atribuindo FUNCIONARIO como gerente", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Projeto Teste",
          managerId: funcionario.id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("não é gerente");
    });
  });

  describe("GET /api/projects - Listar projetos", () => {
    it("ADMIN deve ver todos os projetos", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente1 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente1@test.com",
      });
      const gerente2 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente2@test.com",
      });

      // Criar 2 projetos com gerentes diferentes
      await TestHelpers.createProject(gerente1.id, { title: "Projeto 1" });
      await TestHelpers.createProject(gerente2.id, { title: "Projeto 2" });

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
    });

    it("GERENTE deve ver apenas seus projetos", async () => {
      const gerente1 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente1@test.com",
      });
      const gerente2 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente2@test.com",
      });

      // Criar 1 projeto para gerente1 e 1 para gerente2
      await TestHelpers.createProject(gerente1.id, {
        title: "Projeto Gerente 1",
      });
      await TestHelpers.createProject(gerente2.id, {
        title: "Projeto Gerente 2",
      });

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Projeto Gerente 1");
      expect(body[0].managerId).toBe(gerente1.id);
    });

    it("FUNCIONARIO deve ver apenas projetos onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });

      // Criar 2 projetos
      const projeto1 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto 1",
      });
      const projeto2 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto 2",
      });

      // Adicionar funcionário apenas no projeto1
      await TestHelpers.addProjectMember(projeto1.id, funcionario.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(projeto1.id);
    });

    it("FUNCIONARIO sem projetos deve receber lista vazia", async () => {
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "GET",
        url: "/api/projects",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(0);
    });
  });

  describe("GET /api/projects/:id - Buscar projeto", () => {
    it("ADMIN deve ver qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(projeto.id);
    });

    it("GERENTE deve ver seu próprio projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(projeto.id);
    });

    it("GERENTE não deve ver projeto de outro gerente", async () => {
      const gerente1 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente1@test.com",
      });
      const gerente2 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente2@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("permissão");
    });

    it("FUNCIONARIO deve ver projeto onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      // Adicionar funcionário ao projeto
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(projeto.id);
    });

    it("FUNCIONARIO não deve ver projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PUT /api/projects/:id - Atualizar projeto", () => {
    it("ADMIN deve conseguir atualizar qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id, {
        title: "Título Original",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "PUT",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Título Atualizado",
          status: "EM_ANDAMENTO",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe("Título Atualizado");
      expect(body.status).toBe("EM_ANDAMENTO");
    });

    it("GERENTE deve conseguir atualizar seu próprio projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "PUT",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Novo Título",
          priority: "URGENTE",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe("Novo Título");
      expect(body.priority).toBe("URGENTE");
    });

    it("GERENTE não deve atualizar projeto de outro gerente", async () => {
      const gerente1 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente1@test.com",
      });
      const gerente2 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente2@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await app.inject({
        method: "PUT",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Tentando Atualizar",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir atualizar projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "PUT",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          title: "Tentando Atualizar",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/projects/:id - Deletar projeto", () => {
    it("ADMIN deve conseguir deletar projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("deletado");
    });

    it("GERENTE não deve conseguir deletar projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir deletar projeto", async () => {
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /api/projects/:id/members - Adicionar membro", () => {
    it("ADMIN deve conseguir adicionar membro", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          userId: funcionario.id,
          role: "Desenvolvedor",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.userId).toBe(funcionario.id);
      expect(body.role).toBe("Desenvolvedor");
    });

    it("GERENTE deve conseguir adicionar membro ao seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          userId: funcionario.id,
          role: "Designer",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.role).toBe("Designer");
    });

    it("GERENTE não deve adicionar membro em projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente1@test.com",
      });
      const gerente2 = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente2@test.com",
      });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          userId: funcionario.id,
          role: "Desenvolvedor",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("permissão");
    });

    it("não deve adicionar mesmo membro duas vezes", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      // Adicionar membro pela primeira vez
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const token = TestHelpers.generateToken(app, gerente);

      // Tentar adicionar novamente
      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          userId: funcionario.id,
          role: "Desenvolvedor",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("já é membro");
    });
  });

  describe("DELETE /api/projects/:id/members/:memberId - Remover membro", () => {
    it("ADMIN deve conseguir remover membro", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}/members/${funcionario.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("removido");
    });

    it("GERENTE deve conseguir remover membro do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}/members/${funcionario.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("FUNCIONARIO não deve conseguir remover membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func1@test.com",
      });
      const func2 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func2@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, func1.id);
      await TestHelpers.addProjectMember(projeto.id, func2.id);

      const token = TestHelpers.generateToken(app, func1);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/projects/${projeto.id}/members/${func2.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /api/projects/:id/members - Listar membros", () => {
    it("ADMIN deve ver membros de qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({
        role: "GERENTE",
        email: "gerente@test.com",
      });
      const func = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, func.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe(func.id);
    });

    it("GERENTE deve ver membros do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, func.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
    });

    it("FUNCIONARIO deve ver membros do projeto onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func1@test.com",
      });
      const func2 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func2@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, func1.id);
      await TestHelpers.addProjectMember(projeto.id, func2.id);

      const token = TestHelpers.generateToken(app, func1);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
    });

    it("FUNCIONARIO não deve ver membros de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func1@test.com",
      });
      const func2 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
        email: "func2@test.com",
      });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, func2.id);

      const token = TestHelpers.generateToken(app, func1);

      const response = await app.inject({
        method: "GET",
        url: `/api/projects/${projeto.id}/members`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
