import { describe, it, expect } from "vitest";
import { authorize } from "../../shared/middlewares/authorize";
import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../shared/types";

describe("Authorization Middleware", () => {
  // Mock do FastifyReply
  const createMockReply = () => {
    let statusCode = 200;
    let responseData: any = null;
    let statusCalled = false;

    return {
      status: (code: number) => {
        statusCode = code;
        statusCalled = true;
        return {
          send: (data: any) => {
            responseData = data;
            return statusCode;
          },
        };
      },
      getStatusCode: () => statusCode,
      getResponseData: () => responseData,
      wasStatusCalled: () => statusCalled,
    };
  };

  const createMockRequest = (role: string): Partial<AuthenticatedRequest> => ({
    user: {
      id: "test-user-1",
      email: "test@example.com",
      role,
    },
  });

  describe("ADMIN role", () => {
    it("ADMIN deve ter acesso a rotas ADMIN", async () => {
      const authMiddleware = authorize(["ADMIN"]);
      const request = createMockRequest("ADMIN");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false); // Não foi bloqueado
    });

    it("ADMIN deve ter acesso a rotas GERENTE", async () => {
      const authMiddleware = authorize(["GERENTE"]);
      const request = createMockRequest("ADMIN");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });

    it("ADMIN deve ter acesso a rotas FUNCIONARIO", async () => {
      const authMiddleware = authorize(["FUNCIONARIO"]);
      const request = createMockRequest("ADMIN");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });

    it("ADMIN deve ter acesso a múltiplas roles", async () => {
      const authMiddleware = authorize(["GERENTE", "FUNCIONARIO"]);
      const request = createMockRequest("ADMIN");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });
  });

  describe("GERENTE role", () => {
    it("GERENTE deve ter acesso a rotas GERENTE", async () => {
      const authMiddleware = authorize(["GERENTE"]);
      const request = createMockRequest("GERENTE");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });

    it("GERENTE não deve ter acesso a rotas ADMIN", async () => {
      const authMiddleware = authorize(["ADMIN"]);
      const request = createMockRequest("GERENTE");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });

    it("GERENTE não deve ter acesso a rotas exclusivas FUNCIONARIO", async () => {
      const authMiddleware = authorize(["FUNCIONARIO"]);
      const request = createMockRequest("GERENTE");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });

    it("GERENTE deve ter acesso a rotas GERENTE + FUNCIONARIO", async () => {
      const authMiddleware = authorize(["GERENTE", "FUNCIONARIO"]);
      const request = createMockRequest("GERENTE");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });

    it("GERENTE não deve ter acesso a rotas ADMIN + FUNCIONARIO (exclusivas)", async () => {
      const authMiddleware = authorize(["ADMIN", "FUNCIONARIO"]);
      const request = createMockRequest("GERENTE");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });
  });

  describe("FUNCIONARIO role", () => {
    it("FUNCIONARIO deve ter acesso a rotas FUNCIONARIO", async () => {
      const authMiddleware = authorize(["FUNCIONARIO"]);
      const request = createMockRequest("FUNCIONARIO");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(false);
    });

    it("FUNCIONARIO não deve ter acesso a rotas ADMIN", async () => {
      const authMiddleware = authorize(["ADMIN"]);
      const request = createMockRequest("FUNCIONARIO");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });

    it("FUNCIONARIO não deve ter acesso a rotas GERENTE", async () => {
      const authMiddleware = authorize(["GERENTE"]);
      const request = createMockRequest("FUNCIONARIO");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });

    it("FUNCIONARIO não deve ter acesso a rotas ADMIN + GERENTE", async () => {
      const authMiddleware = authorize(["ADMIN", "GERENTE"]);
      const request = createMockRequest("FUNCIONARIO");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true);
      expect(reply.getStatusCode()).toBe(403);
    });
  });

  describe("Edge cases", () => {
    it("deve retornar 403 com mensagem apropriada", async () => {
      const authMiddleware = authorize(["ADMIN"]);
      const request = createMockRequest("FUNCIONARIO");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.getResponseData()).toHaveProperty("error");
      expect(reply.getResponseData().error).toContain("permissão");
    });

    it("deve lidar com array vazio de roles", async () => {
      const authMiddleware = authorize([]);
      const request = createMockRequest("ADMIN");
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true); // Sem roles, bloqueia tudo
    });

    it("deve ser case-sensitive com roles", async () => {
      const authMiddleware = authorize(["admin"]); // lowercase
      const request = createMockRequest("ADMIN"); // uppercase
      const reply = createMockReply() as any;

      await authMiddleware(request as AuthenticatedRequest, reply);

      expect(reply.wasStatusCalled()).toBe(true); // Deve bloquear por case difference
    });

    it("deve aceitar múltiplas roles corretamente", async () => {
      const authMiddleware = authorize(["ADMIN", "GERENTE", "FUNCIONARIO"]);
      const adminRequest = createMockRequest("ADMIN");
      const gerenteRequest = createMockRequest("GERENTE");
      const funcionarioRequest = createMockRequest("FUNCIONARIO");

      const adminReply = createMockReply() as any;
      const gerenteReply = createMockReply() as any;
      const funcionarioReply = createMockReply() as any;

      await authMiddleware(adminRequest as AuthenticatedRequest, adminReply);
      await authMiddleware(
        gerenteRequest as AuthenticatedRequest,
        gerenteReply
      );
      await authMiddleware(
        funcionarioRequest as AuthenticatedRequest,
        funcionarioReply
      );

      expect(adminReply.wasStatusCalled()).toBe(false);
      expect(gerenteReply.wasStatusCalled()).toBe(false);
      expect(funcionarioReply.wasStatusCalled()).toBe(false);
    });

    it("deve ser uma função que retorna middleware", () => {
      const result = authorize(["ADMIN"]);
      expect(typeof result).toBe("function");
    });
  });
});
