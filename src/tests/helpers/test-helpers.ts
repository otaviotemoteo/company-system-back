import { prisma } from "../../config/database";
import { hashPassword } from "../../shared/utils/password";
import { FastifyInstance } from "fastify";

export class TestHelpers {
  // Criar usuário de teste
  static async createUser(data?: {
    name?: string;
    email?: string;
    password?: string;
    role?: "ADMIN" | "GERENTE" | "FUNCIONARIO";
  }) {
    const hashedPassword = await hashPassword(data?.password || "123456");

    return await prisma.user.create({
      data: {
        name: data?.name || "Test User",
        email: data?.email || `test_${Date.now()}@test.com`,
        password: hashedPassword,
        role: data?.role || "FUNCIONARIO",
      },
    });
  }

  // Criar projeto de teste
  static async createProject(
    managerId: string,
    data?: {
      title?: string;
      description?: string;
    }
  ) {
    return await prisma.project.create({
      data: {
        title: data?.title || "Test Project",
        description: data?.description || "Test Description",
        managerId,
      },
    });
  }

  // Adicionar membro ao projeto
  static async addProjectMember(
    projectId: string,
    userId: string,
    role: string = "Desenvolvedor"
  ) {
    return await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
  }

  // Gerar token JWT
  static generateToken(
    app: FastifyInstance,
    user: { id: string; email: string; role: string }
  ) {
    return app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  // Limpar banco (caso necessário)
  static async clearDatabase() {
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.document.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectPhase.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  }
}
