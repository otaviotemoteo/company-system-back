import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";

describe("Comments Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("GET /api/comments/task/:taskId - Listar comentários de tarefa", () => {
    it("ADMIN deve conseguir listar comentários de qualquer tarefa", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      await TestHelpers.createComment(funcionario.id, tarefa.id, {
        content: "Comentário 1",
      });
      await TestHelpers.createComment(gerente.id, tarefa.id, {
        content: "Comentário 2",
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("GERENTE deve listar comentários de tarefa do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      await TestHelpers.createComment(funcionario.id, tarefa.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("FUNCIONARIO deve listar comentários de tarefa atribuída a ele", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });

      await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("FUNCIONARIO membro do projeto deve listar comentários", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("FUNCIONARIO não deve listar comentários de tarefa de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("comentários devem estar ordenados por data (mais recentes primeiro)", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const comment1 = await TestHelpers.createComment(gerente.id, tarefa.id, {
        content: "Primeiro",
      });

      // Pequeno delay para garantir ordem
      await new Promise((resolve) => setTimeout(resolve, 10));

      const comment2 = await TestHelpers.createComment(gerente.id, tarefa.id, {
        content: "Segundo",
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/comments/task/${tarefa.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body[0].content).toBe("Segundo"); // Mais recente primeiro
      expect(response.body[1].content).toBe("Primeiro");
    });
  });

  describe("POST /api/comments - Criar comentário", () => {
    it("FUNCIONARIO deve conseguir comentar em tarefa atribuída a ele", async () => {
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
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Meu comentário sobre a tarefa",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe("Meu comentário sobre a tarefa");
      expect(response.body.authorId).toBe(funcionario.id);
      expect(response.body.taskId).toBe(tarefa.id);
    });

    it("FUNCIONARIO membro do projeto deve conseguir comentar", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Comentário do membro",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(201);
    });

    it("GERENTE deve conseguir comentar em tarefa do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Comentário do gerente",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(201);
    });

    it("ADMIN deve conseguir comentar em qualquer tarefa", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Comentário do admin",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(201);
    });

    it("FUNCIONARIO não deve comentar em tarefa de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Tentando comentar",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(403);
    });

    it("não deve criar comentário vazio", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "",
          taskId: tarefa.id,
        });

      expect(response.status).toBe(400);
    });

    it("não deve criar comentário muito longo", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "a".repeat(1001), // Mais de 1000 caracteres
          taskId: tarefa.id,
        });

      expect(response.status).toBe(400);
    });

    it("não deve criar comentário em tarefa inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Comentário",
          taskId: "invalid-id",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/comments/:id - Atualizar comentário", () => {
    it("autor deve conseguir editar próprio comentário", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const comentario = await TestHelpers.createComment(
        gerente.id,
        tarefa.id,
        {
          content: "Comentário original",
        },
      );

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Comentário editado",
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe("Comentário editado");
      expect(response.body.id).toBe(comentario.id);
    });

    it("usuário não deve editar comentário de outro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const comentario = await TestHelpers.createComment(
        funcionario.id,
        tarefa.id,
      );

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Tentando editar",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("autor");
    });

    it("ADMIN não deve editar comentário de outro (apenas autor)", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const comentario = await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .put(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "Admin tentando editar",
        });

      expect(response.status).toBe(403);
    });

    it("não deve atualizar comentário com conteúdo vazio", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const comentario = await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .put(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: "",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/comments/:id - Deletar comentário", () => {
    it("autor deve conseguir deletar próprio comentário", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const comentario = await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("deletado");
    });

    it("ADMIN deve conseguir deletar qualquer comentário", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const comentario = await TestHelpers.createComment(gerente.id, tarefa.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .delete(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("usuário não deve deletar comentário de outro (não sendo ADMIN)", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);

      const comentario = await TestHelpers.createComment(
        funcionario.id,
        tarefa.id,
      );

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete(`/api/comments/${comentario.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve deletar comentário inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete("/api/comments/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
