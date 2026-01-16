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
    },
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
    role: string = "Desenvolvedor",
  ) {
    return await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
  }

  static async createPhase(
    projectId: string,
    data?: {
      name?: string;
      description?: string;
      order?: number;
    },
  ) {
    return await prisma.projectPhase.create({
      data: {
        name: data?.name || "Test Phase",
        description: data?.description || "Test Phase Description",
        order: data?.order || 1,
        projectId,
      },
    });
  }

  static async createTask(
    phaseId: string,
    data?: {
      title?: string;
      description?: string;
      assignedToId?: string;
      priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
      estimatedHours?: number;
    },
  ) {
    return await prisma.task.create({
      data: {
        title: data?.title || "Test Task",
        description: data?.description || "Test Task Description",
        phaseId,
        assignedToId: data?.assignedToId,
        priority: data?.priority || "MEDIA",
        estimatedHours: data?.estimatedHours,
      },
    });
  }

  static async createDocument(
    uploadedById: string,
    data?: {
      name?: string;
      type?: "CONTRATO" | "ESPECIFICACAO" | "RELATORIO" | "ENTREGA" | "OUTRO";
      description?: string;
      projectId?: string;
      phaseId?: string;
      taskId?: string;
      fileUrl?: string;
      fileSize?: number;
    },
  ) {
    return await prisma.document.create({
      data: {
        name: data?.name || "Test Document.pdf",
        type: data?.type || "RELATORIO",
        description: data?.description || "Test Document Description",
        fileUrl: data?.fileUrl || "https://example.com/file.pdf",
        fileSize: data?.fileSize || 1024,
        uploadedById,
        projectId: data?.projectId,
        phaseId: data?.phaseId,
        taskId: data?.taskId,
      },
    });
  }

  static async createComment(
    authorId: string,
    taskId: string,
    data?: {
      content?: string;
    },
  ) {
    return await prisma.comment.create({
      data: {
        content: data?.content || "Test comment content",
        authorId,
        taskId,
      },
    });
  }

  static generateToken(
    app: FastifyInstance,
    user: { id: string; email: string; role: string },
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
