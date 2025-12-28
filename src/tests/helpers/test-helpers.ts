import { prisma } from "../../config/database";
import { hashPassword } from "../../shared/utils/password";
import { FastifyInstance } from "fastify";

export class TestHelpers {
  private static counter = 0;

  static generateEmail(prefix: string = "test"): string {
    return `${prefix}_${Date.now()}_${++this.counter}@test.com`;
  }

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
        email: data?.email || this.generateEmail(),
        password: hashedPassword,
        role: data?.role || "FUNCIONARIO",
      },
    });
  }

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
