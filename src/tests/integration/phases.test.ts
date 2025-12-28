import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";

describe("Phases Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("GET /api/phases/project/:projectId - Listar fases de um projeto", () => {
    it("ADMIN deve conseguir listar fases de qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.createPhase(projeto.id, { name: "Fase 1", order: 1 });
      await TestHelpers.createPhase(projeto.id, { name: "Fase 2", order: 2 });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe("Fase 1");
      expect(response.body[0].order).toBe(1);
      expect(response.body[1].name).toBe("Fase 2");
      expect(response.body[1].order).toBe(2);
    });

    it("GERENTE deve conseguir listar fases do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.createPhase(projeto.id, { name: "Análise", order: 1 });
      await TestHelpers.createPhase(projeto.id, {
        name: "Desenvolvimento",
        order: 2,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("GERENTE não deve listar fases de projeto de outro gerente", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);

      await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("permissão");
    });

    it("FUNCIONARIO deve listar fases de projeto onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("FUNCIONARIO não deve listar fases de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve listar fases de projeto inexistente", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/phases/project/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("fases devem estar ordenadas corretamente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.createPhase(projeto.id, { name: "Fase C", order: 3 });
      await TestHelpers.createPhase(projeto.id, { name: "Fase A", order: 1 });
      await TestHelpers.createPhase(projeto.id, { name: "Fase B", order: 2 });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/phases/project/${projeto.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body[0].name).toBe("Fase A");
      expect(response.body[1].name).toBe("Fase B");
      expect(response.body[2].name).toBe("Fase C");
    });
  });

  describe("GET /api/phases/:id - Buscar fase por ID", () => {
    it("ADMIN deve conseguir buscar qualquer fase", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id, {
        name: "Fase Teste",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(fase.id);
      expect(response.body.name).toBe("Fase Teste");
    });

    it("GERENTE deve conseguir buscar fase do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(fase.id);
    });

    it("GERENTE não deve buscar fase de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve buscar fase inexistente", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/phases/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/phases - Criar fase", () => {
    it("ADMIN deve conseguir criar fase em qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Nova Fase",
          description: "Descrição da fase",
          projectId: projeto.id,
          order: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Nova Fase");
      expect(response.body.projectId).toBe(projeto.id);
      expect(response.body.order).toBe(1);
    });

    it("GERENTE deve conseguir criar fase no seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Planejamento",
          projectId: projeto.id,
          order: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Planejamento");
    });

    it("GERENTE não deve criar fase em projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Teste",
          projectId: projeto.id,
          order: 1,
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir criar fase", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Teste",
          projectId: projeto.id,
          order: 1,
        });

      expect(response.status).toBe(403);
    });

    it("não deve criar fase com nome muito curto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Ab",
          projectId: projeto.id,
          order: 1,
        });

      expect(response.status).toBe(400);
    });

    it("não deve criar fase sem campos obrigatórios", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Teste",
        });

      expect(response.status).toBe(400);
    });

    it("não deve criar fase em projeto inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/phases")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Teste",
          projectId: "invalid-id",
          order: 1,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/phases/:id - Atualizar fase", () => {
    it("ADMIN deve conseguir atualizar qualquer fase", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id, {
        name: "Nome Original",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .put(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Nome Atualizado",
          status: "EM_ANDAMENTO",
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Nome Atualizado");
      expect(response.body.status).toBe("EM_ANDAMENTO");
    });

    it("GERENTE deve conseguir atualizar fase do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Revisada",
          order: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Fase Revisada");
      expect(response.body.order).toBe(2);
    });

    it("GERENTE não deve atualizar fase de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .put(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Tentando Atualizar",
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir atualizar fase", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .put(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Tentando Atualizar",
        });

      expect(response.status).toBe(403);
    });

    it("não deve atualizar fase inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put("/api/phases/invalid-id")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Fase Atualizada",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/phases/:id - Deletar fase", () => {
    it("ADMIN deve conseguir deletar qualquer fase", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .delete(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("deletada");
    });

    it("GERENTE deve conseguir deletar fase do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("GERENTE não deve deletar fase de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .delete(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir deletar fase", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .delete(`/api/phases/${fase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve deletar fase inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete("/api/phases/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/phases/project/:projectId/reorder - Reordenar fases", () => {
    it("ADMIN deve conseguir reordenar fases de qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const fase1 = await TestHelpers.createPhase(projeto.id, {
        name: "Fase 1",
        order: 1,
      });
      const fase2 = await TestHelpers.createPhase(projeto.id, {
        name: "Fase 2",
        order: 2,
      });
      const fase3 = await TestHelpers.createPhase(projeto.id, {
        name: "Fase 3",
        order: 3,
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .put(`/api/phases/project/${projeto.id}/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          phases: [
            { phaseId: fase3.id, order: 1 },
            { phaseId: fase1.id, order: 2 },
            { phaseId: fase2.id, order: 3 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].id).toBe(fase3.id);
      expect(response.body[1].id).toBe(fase1.id);
      expect(response.body[2].id).toBe(fase2.id);
    });

    it("GERENTE deve conseguir reordenar fases do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const fase1 = await TestHelpers.createPhase(projeto.id, { order: 1 });
      const fase2 = await TestHelpers.createPhase(projeto.id, { order: 2 });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/phases/project/${projeto.id}/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          phases: [
            { phaseId: fase2.id, order: 1 },
            { phaseId: fase1.id, order: 2 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body[0].id).toBe(fase2.id);
      expect(response.body[1].id).toBe(fase1.id);
    });

    it("GERENTE não deve reordenar fases de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .put(`/api/phases/project/${projeto.id}/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          phases: [{ phaseId: fase.id, order: 1 }],
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir reordenar fases", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .put(`/api/phases/project/${projeto.id}/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          phases: [{ phaseId: fase.id, order: 1 }],
        });

      expect(response.status).toBe(403);
    });
  });
});
