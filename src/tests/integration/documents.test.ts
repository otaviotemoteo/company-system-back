import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { TestHelpers } from "../helpers/test-helpers";

describe("Documents Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("GET /api/documents - Listar documentos", () => {
    it("ADMIN deve conseguir listar todos os documentos", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });

      const projeto1 = await TestHelpers.createProject(gerente1.id);
      const projeto2 = await TestHelpers.createProject(gerente2.id);

      await TestHelpers.createDocument(admin.id, {
        name: "Doc Projeto 1",
        projectId: projeto1.id,
      });
      await TestHelpers.createDocument(admin.id, {
        name: "Doc Projeto 2",
        projectId: projeto2.id,
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get("/api/documents")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("GERENTE deve listar apenas documentos dos seus projetos", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });

      const projeto1 = await TestHelpers.createProject(gerente1.id);
      const projeto2 = await TestHelpers.createProject(gerente2.id);

      await TestHelpers.createDocument(gerente1.id, {
        name: "Doc Gerente 1",
        projectId: projeto1.id,
      });
      await TestHelpers.createDocument(gerente2.id, {
        name: "Doc Gerente 2",
        projectId: projeto2.id,
      });

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get("/api/documents")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Doc Gerente 1");
    });

    it("FUNCIONARIO deve listar documentos de projetos onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });

      const projeto1 = await TestHelpers.createProject(gerente.id);
      const projeto2 = await TestHelpers.createProject(gerente.id);

      await TestHelpers.addProjectMember(projeto1.id, funcionario.id);

      await TestHelpers.createDocument(gerente.id, {
        name: "Doc Projeto 1",
        projectId: projeto1.id,
      });
      await TestHelpers.createDocument(gerente.id, {
        name: "Doc Projeto 2",
        projectId: projeto2.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get("/api/documents")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Doc Projeto 1");
    });

    it("deve filtrar documentos por tipo", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      await TestHelpers.createDocument(gerente.id, {
        type: "CONTRATO",
        projectId: projeto.id,
      });
      await TestHelpers.createDocument(gerente.id, {
        type: "RELATORIO",
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get("/api/documents?type=CONTRATO")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe("CONTRATO");
    });

    it("deve filtrar documentos por projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto1 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto A",
      });
      const projeto2 = await TestHelpers.createProject(gerente.id, {
        title: "Projeto B",
      });

      await TestHelpers.createDocument(gerente.id, { projectId: projeto1.id });
      await TestHelpers.createDocument(gerente.id, { projectId: projeto2.id });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/documents?projectId=${projeto1.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe("GET /api/documents/:id - Buscar documento", () => {
    it("ADMIN deve conseguir buscar qualquer documento", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const documento = await TestHelpers.createDocument(gerente.id, {
        name: "Documento Teste",
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .get(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(documento.id);
      expect(response.body.name).toBe("Documento Teste");
    });

    it("GERENTE deve conseguir buscar documento do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const documento = await TestHelpers.createDocument(gerente.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .get(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(documento.id);
    });

    it("GERENTE não deve buscar documento de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const documento = await TestHelpers.createDocument(gerente2.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .get(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO deve buscar documento de projeto onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const documento = await TestHelpers.createDocument(gerente.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(documento.id);
    });

    it("FUNCIONARIO não deve buscar documento de projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const documento = await TestHelpers.createDocument(gerente.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .get(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/documents - Upload documento", () => {
    it("ADMIN deve conseguir fazer upload em qualquer projeto", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Contrato.pdf",
          type: "CONTRATO",
          description: "Contrato do projeto",
          projectId: projeto.id,
          fileUrl: "https://example.com/contrato.pdf",
          fileSize: 2048,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Contrato.pdf");
      expect(response.body.type).toBe("CONTRATO");
    });

    it("GERENTE deve conseguir fazer upload no seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Especificacao.docx",
          type: "ESPECIFICACAO",
          projectId: projeto.id,
          fileUrl: "https://example.com/spec.docx",
          fileSize: 1500,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Especificacao.docx");
    });

    it("GERENTE não deve fazer upload em projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Documento.pdf",
          type: "RELATORIO",
          projectId: projeto.id,
          fileUrl: "https://example.com/doc.pdf",
          fileSize: 1000,
        });

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO deve fazer upload em projeto onde é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Entrega.zip",
          type: "ENTREGA",
          projectId: projeto.id,
          fileUrl: "https://example.com/entrega.zip",
          fileSize: 5000,
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe("ENTREGA");
    });

    it("FUNCIONARIO deve fazer upload em tarefa atribuída a ele", async () => {
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
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Codigo.zip",
          type: "ENTREGA",
          taskId: tarefa.id,
          fileUrl: "https://example.com/codigo.zip",
          fileSize: 3000,
        });

      expect(response.status).toBe(201);
    });

    it("FUNCIONARIO não deve fazer upload em projeto onde não é membro", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Documento.pdf",
          type: "OUTRO",
          projectId: projeto.id,
          fileUrl: "https://example.com/doc.pdf",
          fileSize: 1000,
        });

      expect(response.status).toBe(403);
    });

    it("não deve fazer upload sem vínculo (projeto/fase/tarefa)", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Documento.pdf",
          type: "OUTRO",
          fileUrl: "https://example.com/doc.pdf",
          fileSize: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("vinculado");
    });

    it("não deve fazer upload sem campos obrigatórios", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .post("/api/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Documento.pdf",
          projectId: projeto.id,
          // Faltando: type, fileUrl, fileSize
        });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/documents/:id - Deletar documento", () => {
    it("ADMIN deve conseguir deletar qualquer documento", async () => {
      const admin = await TestHelpers.createUser({ role: "ADMIN" });
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const documento = await TestHelpers.createDocument(gerente.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, admin);

      const response = await request(app.server)
        .delete(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("deletado");
    });

    it("GERENTE deve conseguir deletar documento do seu projeto", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente.id);
      const documento = await TestHelpers.createDocument(gerente.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("GERENTE não deve deletar documento de projeto de outro", async () => {
      const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
      const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
      const projeto = await TestHelpers.createProject(gerente2.id);
      const documento = await TestHelpers.createDocument(gerente2.id, {
        projectId: projeto.id,
      });

      const token = TestHelpers.generateToken(app, gerente1);

      const response = await request(app.server)
        .delete(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("FUNCIONARIO deve deletar próprio documento de tarefa", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id, {
        assignedToId: funcionario.id,
      });
      const documento = await TestHelpers.createDocument(funcionario.id, {
        taskId: tarefa.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .delete(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it("FUNCIONARIO não deve deletar documento de outro usuário", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const funcionario = await TestHelpers.createUser({ role: "FUNCIONARIO" });
      const projeto = await TestHelpers.createProject(gerente.id);
      await TestHelpers.addProjectMember(projeto.id, funcionario.id);
      const fase = await TestHelpers.createPhase(projeto.id);
      const tarefa = await TestHelpers.createTask(fase.id);
      const documento = await TestHelpers.createDocument(gerente.id, {
        taskId: tarefa.id,
      });

      const token = TestHelpers.generateToken(app, funcionario);

      const response = await request(app.server)
        .delete(`/api/documents/${documento.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("não deve deletar documento inexistente", async () => {
      const gerente = await TestHelpers.createUser({ role: "GERENTE" });
      const token = TestHelpers.generateToken(app, gerente);

      const response = await request(app.server)
        .delete("/api/documents/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
