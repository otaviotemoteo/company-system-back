import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";
import { prisma } from "../../config/database";

describe("Tasks Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("GET /api/tasks - Listar tarefas", () => {
    it("ADMIN deve conseguir listar todas as tarefas", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });

      const projeto1 = await TestHelpers.createProject(gerente1.id);
      const projeto2 = await TestHelpers.createProject(gerente2.id);
      const fase1 = await TestHelpers.createPhase(projeto1.id);
      const fase2 = await TestHelpers.createPhase(projeto2.id);

      await TestHelpers.createTask(fase1.id, { title: "Tarefa 1" });
      await TestHelpers.createTask(fase2.id, { title: "Tarefa 2" });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("GERENTE deve listar apenas tarefas dos seus projetos", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });

      const projeto1 = await TestHelpers.createProject(gerente1.id);
      const projeto2 = await TestHelpers.createProject(gerente2.id);
      const fase1 = await TestHelpers.createPhase(projeto1.id);
      const fase2 = await TestHelpers.createPhase(projeto2.id);

      await TestHelpers.createTask(fase1.id, { title: "Tarefa Gerente 1" });
      await TestHelpers.createTask(fase2.id, { title: "Tarefa Gerente 2" });

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Tarefa Gerente 1");
    });

    it("FUNCIONARIO pode filtrar apenas tarefas atribuídas a ele", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const func2 = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, func1.id);
      await TestHelpers.addProjectMember(projeto.id, func2.id);

      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, {
        title: "Tarefa Func 1",
        assignedToId: func1.id,
      });
      await TestHelpers.createTask(fase.id, {
        title: "Tarefa Func 2",
        assignedToId: func2.id,
      });

      const token = TestHelpers.generateToken(app, func1);

      const response = await request(app.server)
        .get(`/api/tasks?assignedToId=${func1.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Tarefa Func 1");
    });

    it("FUNCIONARIO deve listar tarefas de projetos onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const func2 = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, func1.id);
      await TestHelpers.addProjectMember(projeto.id, func2.id);

      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, {
        title: "Tarefa Func 1",
        assignedToId: func1.id,
      });
      await TestHelpers.createTask(fase.id, {
        title: "Tarefa Func 2",
        assignedToId: func2.id,
      });

      const token = TestHelpers.generateToken(app, func1);

      const response = await request(app.server)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("deve filtrar tarefas por status", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      await TestHelpers.createTask(fase.id, { title: "Pendente" });
      const tarefaConcluida = await TestHelpers.createTask(fase.id, {
        title: "Concluída",
      });

      // Atualizar status
      await prisma.task.update({
        where: { id: tarefaConcluida.id },
        data: { status: "CONCLUIDA" },
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/tasks?status=CONCLUIDA")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe("CONCLUIDA");
    });

    it("deve filtrar tarefas por projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto1 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto 1",
      });
      const projeto2 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto 2",
      });
      const fase1 = await TestHelpers.createPhase(projeto1.id);
      const fase2 = await TestHelpers.createPhase(projeto2.id);

      await TestHelpers.createTask(fase1.id);
      await TestHelpers.createTask(fase2.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/tasks?projectId=${projeto1.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe("GET /api/tasks/:id - Buscar tarefa", () => {
    it("ADMIN deve conseguir buscar qualquer tarefa", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        title: "Tarefa Teste",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(tarefa.id);
      expect(response.body.title).toBe("Tarefa Teste");
    });

    it("GERENTE deve conseguir buscar tarefa do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(tarefa.id);
    });

    it("GERENTE não deve buscar tarefa de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO deve buscar tarefa atribuída a ele", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(tarefa.id);
    });

    it("FUNCIONARIO membro do projeto deve buscar qualquer tarefa", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("FUNCIONARIO não deve buscar tarefa de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/tasks - Criar tarefa", () => {
    it("ADMIN deve conseguir criar tarefa em qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Nova Tarefa",
          description: "Descrição da tarefa",
          phaseId: fase.id,
          assignedToId: funcionario.id,
          priority: "ALTA",
          estimatedHours: 8,
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Nova Tarefa");
      expect(response.body.assignedToId).toBe(funcionario.id);
      expect(response.body.priority).toBe("ALTA");
    });

    it("GERENTE deve conseguir criar tarefa no seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Desenvolver Feature",
          phaseId: fase.id,
          assignedToId: funcionario.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Desenvolver Feature");
    });

    it("GERENTE não deve criar tarefa em projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Teste",
          phaseId: fase.id,
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir criar tarefa", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Teste",
          phaseId: fase.id,
        });

      expect(response.status).toBe(403);
    });

    it("não deve criar tarefa atribuindo usuário que não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Teste",
          phaseId: fase.id,
          assignedToId: funcionario.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("não é membro");
    });

    it("não deve criar tarefa com título muito curto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Ab",
          phaseId: fase.id,
        });

      expect(response.status).toBe(400);
    });

    it("não deve criar tarefa sem campos obrigatórios", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Teste",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/tasks/:id - Atualizar tarefa", () => {
    it("ADMIN deve conseguir atualizar qualquer tarefa", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        title: "Título Original",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .put(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Título Atualizado",
          priority: "URGENTE",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Título Atualizado");
      expect(response.body.priority).toBe("URGENTE");
    });

    it("GERENTE deve conseguir atualizar tarefa do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Revisada",
          estimatedHours: 16,
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Tarefa Revisada");
    });

    it("GERENTE não deve atualizar tarefa de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .put(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tentando Atualizar",
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO não deve conseguir atualizar tarefa", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .put(`/api/tasks/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tentando Atualizar",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/tasks/:id/status - Atualizar status", () => {
    it("FUNCIONARIO atribuído deve conseguir atualizar status da sua tarefa", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .patch(`/api/tasks/${tarefa.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "EM_ANDAMENTO",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("EM_ANDAMENTO");
    });

    it("GERENTE deve conseguir atualizar status de tarefa do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .patch(`/api/tasks/${tarefa.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "EM_REVISAO",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("EM_REVISAO");
    });

    it("ADMIN deve conseguir atualizar status de qualquer tarefa", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .patch(`/api/tasks/${tarefa.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "CONCLUIDA",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("CONCLUIDA");
      expect(response.body.completedAt).toBeTruthy();
    });

    it("FUNCIONARIO não deve atualizar status de tarefa não atribuída a ele", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const func1 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const func2 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, func1.id);
      await TestHelpers.addProjectMember(projeto.id, func2.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: func2.id,
      });

      const token = TestHelpers.generateToken(app, func1);

      const response = await request(app.server)
        .patch(`/api/tasks/${tarefa.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "EM_ANDAMENTO",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/tasks/:id/hours - Registrar horas", () => {
    it("FUNCIONARIO atribuído deve conseguir registrar horas", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
        estimatedHours: 10,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post(`/api/tasks/${tarefa.id}/hours`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          hours: 4,
          description: "Trabalhei na implementação",
        });

      expect(response.status).toBe(200);
      expect(response.body.workedHours).toBe(4);
      expect(response.body.estimatedHours).toBe(10);
    });

    describe("POST /api/tasks/:id/hours - Registrar horas", () => {
      it("FUNCIONARIO atribuído deve conseguir registrar horas", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
          estimatedHours: 10,
        });

        const token = TestHelpers.generateToken(app, funcionario);

        const response = await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: 4,
            description: "Trabalhei na implementação",
          });

        expect(response.status).toBe(200);
        expect(response.body.workedHours).toBe(4);
        expect(response.body.estimatedHours).toBe(10);
      });

      it("deve acumular horas trabalhadas em múltiplos registros", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
          estimatedHours: 10,
        });

        const token = TestHelpers.generateToken(app, funcionario);

        // Primeiro registro
        await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: 3,
            description: "Primeira parte",
          });

        // Segundo registro
        const response = await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: 5,
            description: "Segunda parte",
          });

        expect(response.status).toBe(200);
        expect(response.body.workedHours).toBe(8);
      });

      it("FUNCIONARIO não deve registrar horas em tarefa não atribuída a ele", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const func1 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
        const func2 = await TestHelpers.createUser({ role: "FUNCIONARIO" });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, func1.id);
        await TestHelpers.addProjectMember(projeto.id, func2.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: func2.id,
        });

        const token = TestHelpers.generateToken(app, func1);

        const response = await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: 2,
            description: "Tentando registrar",
          });

        expect(response.status).toBe(403);
      });

      it("não deve registrar horas negativas ou zero", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
        });

        const token = TestHelpers.generateToken(app, funcionario);

        const response = await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: -2,
            description: "Horas inválidas",
          });

        expect(response.status).toBe(400);
      });

      it("GERENTE deve conseguir registrar horas em tarefa do seu projeto", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
        });

        const token = TestHelpers.generateToken(app, gerente);

        const response = await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            hours: 3,
            description: "Ajuste de horas",
          });

        expect(response.status).toBe(200);
        expect(response.body.workedHours).toBe(3);
      });
    });

    describe("DELETE /api/tasks/:id - Deletar tarefa", () => {
      it("ADMIN deve conseguir deletar qualquer tarefa", async () => {
        const admin = await TestHelpers.createUser({ role: "ADMIN" });
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const projeto = await TestHelpers.createProject(gerente.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id);

        const token = TestHelpers.generateToken(app, admin);

        const response = await request(app.server)
          .delete(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(204);

        // Verificar se foi deletada
        const checkResponse = await request(app.server)
          .get(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(checkResponse.status).toBe(404);
      });

      it("GERENTE deve conseguir deletar tarefa do seu projeto", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const projeto = await TestHelpers.createProject(gerente.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id);

        const token = TestHelpers.generateToken(app, gerente);

        const response = await request(app.server)
          .delete(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(204);
      });

      it("GERENTE não deve deletar tarefa de projeto de outro", async () => {
        const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
        const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
        const projeto = await TestHelpers.createProject(gerente2.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id);

        const token = TestHelpers.generateToken(app, gerente1);

        const response = await request(app.server)
          .delete(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(403);
      });

      it("FUNCIONARIO não deve conseguir deletar tarefa", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
        });

        const token = TestHelpers.generateToken(app, funcionario);

        const response = await request(app.server)
          .delete(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(403);
      });

      it("não deve deletar tarefa que não existe", async () => {
        const admin = await TestHelpers.createUser({ role: "ADMIN" });
        const token = TestHelpers.generateToken(app, admin);

        const response = await request(app.server)
          .delete("/api/tasks/00000000-0000-0000-0000-000000000000")
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
      });

      it("deve deletar tarefa com horas trabalhadas registradas", async () => {
        const gerente = await TestHelpers.createUser({ role: "GERENTE" });
        const funcionario = await TestHelpers.createUser({
          role: "FUNCIONARIO",
        });
        const projeto = await TestHelpers.createProject(gerente.id);
        await TestHelpers.addProjectMember(projeto.id, funcionario.id);
        const fase = await TestHelpers.createPhase(projeto.id);
        const tarefa = await TestHelpers.createTask(fase.id, {
          assignedToId: funcionario.id,
        });

        const tokenFunc = TestHelpers.generateToken(app, funcionario);

        // Registrar horas
        await request(app.server)
          .post(`/api/tasks/${tarefa.id}/hours`)
          .set("Authorization", `Bearer ${tokenFunc}`)
          .send({
            hours: 5,
            description: "Trabalho realizado",
          });

        const tokenGerente = TestHelpers.generateToken(app, gerente);

        // Deletar tarefa (deve deletar mesmo com horas registradas)
        const response = await request(app.server)
          .delete(`/api/tasks/${tarefa.id}`)
          .set("Authorization", `Bearer ${tokenGerente}`);

        expect(response.status).toBe(204);

        // Verificar que a tarefa foi deletada
        const tarefaCheck = await prisma.task.findUnique({
          where: { id: tarefa.id },
        });

        expect(tarefaCheck).toBeNull();
      });
    });
  });
});
