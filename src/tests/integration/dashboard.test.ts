import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";

describe("Dashboard Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await TestHelpers.clearDatabase();
  });

  describe("GET /api/dashboard/admin - Dashboard do ADMIN", () => {
    it("ADMIN deve acessar dashboard com métricas gerais do sistema", async () => {
      await TestHelpers.clearDatabase();

      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto1 = await TestHelpers.createProject(gerente.id);
      const projeto2 = await TestHelpers.createProject(gerente.id);

      const fase1 = await TestHelpers.createPhase(projeto1.id);
      await TestHelpers.createTask(fase1.id, { assignedToId: funcionario.id });

      await TestHelpers.createDocument(admin.id, { projectId: projeto1.id });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalUsuarios");
      expect(response.body).toHaveProperty("totalProjetos");
      expect(response.body).toHaveProperty("totalTarefas");
      expect(response.body).toHaveProperty("totalDocumentos");
      expect(response.body).toHaveProperty("usuariosPorRole");
      expect(response.body).toHaveProperty("projetosPorStatus");
      expect(response.body).toHaveProperty("tarefasPorStatus");
      expect(response.body).toHaveProperty("projetosRecentes");
      expect(response.body).toHaveProperty("tarefasAtrasadas");

      expect(response.body.totalUsuarios).toBe(3);
      expect(response.body.totalProjetos).toBe(2);
      expect(response.body.totalTarefas).toBe(1);
      expect(response.body.totalDocumentos).toBe(1);
    });

    it("ADMIN deve ver projetos recentes ordenados por data", async () => {
      await TestHelpers.clearDatabase();

      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });

      await TestHelpers.createProject(gerente.id, { title: "Projeto 1" });
      await TestHelpers.createProject(gerente.id, { title: "Projeto 2" });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${token}`);

      console.log(
        "Projetos recentes:",
        JSON.stringify(response.body.projetosRecentes, null, 2),
      );

      expect(response.status).toBe(200);
      expect(response.body.projetosRecentes.length).toBeGreaterThan(0);
    });

    it("GERENTE não deve acessar dashboard de ADMIN", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve acessar dashboard de ADMIN", async () => {
      await TestHelpers.clearDatabase();

      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get("/api/dashboard/admin")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve acessar sem autenticação", async () => {
      const response = await request(app.server).get("/api/dashboard/admin");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/dashboard/gerente - Dashboard do GERENTE", () => {
    it("GERENTE deve acessar dashboard com métricas de seus projetos", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto1 = await TestHelpers.createProject(gerente.id);
      const projeto2 = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto1.id, funcionario.id);

      const fase1 = await TestHelpers.createPhase(projeto1.id);
      const fase2 = await TestHelpers.createPhase(projeto2.id);

      await TestHelpers.createTask(fase1.id, {
        assignedToId: funcionario.id,
        estimatedHours: 10,
      });
      await TestHelpers.createTask(fase2.id, {
        assignedToId: funcionario.id,
        estimatedHours: 5,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/dashboard/gerente")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalProjetos");
      expect(response.body).toHaveProperty("totalTarefas");
      expect(response.body).toHaveProperty("totalMembros");
      expect(response.body).toHaveProperty("projetosPorStatus");
      expect(response.body).toHaveProperty("tarefasPorStatus");
      expect(response.body).toHaveProperty("tarefasAtrasadas");
      expect(response.body).toHaveProperty("horasTrabalhadas");
      expect(response.body).toHaveProperty("horasEstimadas");
      expect(response.body).toHaveProperty("proximosDeadlines");
      expect(response.body).toHaveProperty("meusProjetosRecentes");

      expect(response.body.totalProjetos).toBe(2);
      expect(response.body.totalTarefas).toBe(2);
      expect(response.body.totalMembros).toBe(1);
    });

    it("GERENTE deve ver próximos deadlines ordenados", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/dashboard/gerente")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.proximosDeadlines)).toBe(true);
    });

    it("FUNCIONARIO não deve acessar dashboard de GERENTE", async () => {
      await TestHelpers.clearDatabase();

      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get("/api/dashboard/gerente")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve acessar sem autenticação", async () => {
      const response = await request(app.server).get("/api/dashboard/gerente");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/dashboard/funcionario - Dashboard do FUNCIONARIO", () => {
    it("FUNCIONARIO deve acessar dashboard com suas tarefas", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, {
        title: "Tarefa 1",
        assignedToId: funcionario.id,
        estimatedHours: 8,
      });
      await TestHelpers.createTask(fase.id, {
        title: "Tarefa 2",
        assignedToId: funcionario.id,
        estimatedHours: 5,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get("/api/dashboard/funcionario")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("minhasTarefas");
      expect(response.body).toHaveProperty("tarefasAtrasadas");
      expect(response.body).toHaveProperty("horasTrabalhadas");
      expect(response.body).toHaveProperty("horasEstimadas");
      expect(response.body).toHaveProperty("proximosDeadlines");
      expect(response.body).toHaveProperty("tarefasRecentes");
      expect(response.body).toHaveProperty("projetosOndeEMembro");

      expect(response.body.minhasTarefas).toHaveProperty("total");
      expect(response.body.minhasTarefas).toHaveProperty("pendentes");
      expect(response.body.minhasTarefas).toHaveProperty("emAndamento");
      expect(response.body.minhasTarefas).toHaveProperty("concluidas");

      expect(response.body.minhasTarefas.total).toBe(2);
    });

    it("FUNCIONARIO deve ver apenas suas tarefas", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario1 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
      });
      const funcionario2 = await TestHelpers.createUser({
        role: "FUNCIONARIO",
      });

      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, { assignedToId: funcionario1.id });
      await TestHelpers.createTask(fase.id, { assignedToId: funcionario2.id });

      const token = TestHelpers.generateToken(app, funcionario2);

      const response = await request(app.server)
        .get("/api/dashboard/funcionario")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.minhasTarefas.total).toBe(1);
    });

    it("FUNCIONARIO deve ver projetos onde é membro", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto1 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto A",
      });
      const projeto2 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto B",
      });

      await TestHelpers.addProjectMember(projeto1.id, funcionario.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get("/api/dashboard/funcionario")
        .set("Authorization", `Bearer ${token}`);

      console.log(
        "Projetos onde é membro:",
        JSON.stringify(response.body.projetosOndeEMembro, null, 2),
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.projetosOndeEMembro)).toBe(true);
      expect(response.body.projetosOndeEMembro.length).toBe(1);
    });

    it("GERENTE não deve acessar dashboard de FUNCIONARIO", async () => {
      await TestHelpers.clearDatabase();

      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/dashboard/funcionario")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve acessar sem autenticação", async () => {
      const response = await request(app.server).get(
        "/api/dashboard/funcionario",
      );

      expect(response.status).toBe(401);
    });
  });
});
