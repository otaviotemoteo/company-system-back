import { prisma } from "../../config/database";
import { UploadDocumentInput } from "./documents.schemas";

export class DocumentsService {
  // Listar documentos (filtrado por contexto e permissão)
  async findAll(
    userId: string,
    userRole: string,
    filters?: {
      projectId?: string;
      phaseId?: string;
      taskId?: string;
      type?: string;
    }
  ) {
    const where: any = {};

    // Aplicar filtros
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.phaseId) where.phaseId = filters.phaseId;
    if (filters?.taskId) where.taskId = filters.taskId;
    if (filters?.type) where.type = filters.type;

    // Validar permissão baseado no contexto
    if (userRole === "FUNCIONARIO") {
      // Funcionário vê documentos de projetos onde é membro OU tarefas atribuídas a ele
      where.OR = [
        {
          project: {
            members: {
              some: { userId },
            },
          },
        },
        {
          task: {
            assignedToId: userId,
          },
        },
      ];
    }

    if (userRole === "GERENTE") {
      // Gerente vê documentos dos seus projetos
      where.OR = [
        {
          project: {
            managerId: userId,
          },
        },
        {
          phase: {
            project: {
              managerId: userId,
            },
          },
        },
        {
          task: {
            phase: {
              project: {
                managerId: userId,
              },
            },
          },
        },
      ];
    }

    // ADMIN vê tudo

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        phase: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return documents;
  }

  // Buscar documento por ID
  async findById(documentId: string, userId: string, userRole: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: true,
        phase: {
          include: {
            project: true,
          },
        },
        task: {
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    // Validar permissão
    if (userRole !== "ADMIN") {
      let hasPermission = false;

      // Documento de projeto
      if (document.projectId) {
        const isManager = document.project?.managerId === userId;
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: document.projectId,
            },
          },
        });
        hasPermission = isManager || !!isMember;
      }

      // Documento de fase
      if (document.phaseId && !hasPermission) {
        const isManager = document.phase?.project.managerId === userId;
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: document.phase!.projectId,
            },
          },
        });
        hasPermission = isManager || !!isMember;
      }

      // Documento de tarefa
      if (document.taskId && !hasPermission) {
        const isManager = document.task?.phase.project.managerId === userId;
        const isAssigned = document.task?.assignedToId === userId;
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: document.task!.phase.projectId,
            },
          },
        });
        hasPermission = isManager || isAssigned || !!isMember;
      }

      if (!hasPermission) {
        throw new Error("Sem permissão para acessar este documento");
      }
    }

    return document;
  }

  // Upload de documento
  async upload(data: UploadDocumentInput, userId: string, userRole: string) {
    // Validar que tem pelo menos um vínculo
    if (!data.projectId && !data.phaseId && !data.taskId) {
      throw new Error(
        "Documento deve estar vinculado a projeto, fase ou tarefa"
      );
    }

    // Validar permissões baseado no vínculo
    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new Error("Projeto não encontrado");
      }

      // GERENTE só pode fazer upload no seu projeto
      if (userRole === "GERENTE" && project.managerId !== userId) {
        throw new Error("Sem permissão para fazer upload neste projeto");
      }

      // FUNCIONARIO precisa ser membro
      if (userRole === "FUNCIONARIO") {
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: data.projectId,
            },
          },
        });

        if (!isMember) {
          throw new Error("Sem permissão para fazer upload neste projeto");
        }
      }
    }

    if (data.phaseId) {
      const phase = await prisma.projectPhase.findUnique({
        where: { id: data.phaseId },
        include: { project: true },
      });

      if (!phase) {
        throw new Error("Fase não encontrada");
      }

      // Validar permissão no projeto da fase
      if (userRole === "GERENTE" && phase.project.managerId !== userId) {
        throw new Error("Sem permissão para fazer upload nesta fase");
      }

      if (userRole === "FUNCIONARIO") {
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: phase.projectId,
            },
          },
        });

        if (!isMember) {
          throw new Error("Sem permissão para fazer upload nesta fase");
        }
      }
    }

    if (data.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: data.taskId },
        include: {
          phase: {
            include: {
              project: true,
            },
          },
        },
      });

      if (!task) {
        throw new Error("Tarefa não encontrada");
      }

      // FUNCIONARIO só pode fazer upload em tarefa atribuída a ele OU se for membro do projeto
      if (userRole === "FUNCIONARIO") {
        const isAssigned = task.assignedToId === userId;
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: task.phase.projectId,
            },
          },
        });

        if (!isAssigned && !isMember) {
          throw new Error("Sem permissão para fazer upload nesta tarefa");
        }
      }

      // GERENTE precisa ser gerente do projeto
      if (userRole === "GERENTE" && task.phase.project.managerId !== userId) {
        throw new Error("Sem permissão para fazer upload nesta tarefa");
      }
    }

    // Criar documento
    const document = await prisma.document.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        uploadedById: userId,
        projectId: data.projectId,
        phaseId: data.phaseId,
        taskId: data.taskId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  // Deletar documento
  async delete(documentId: string, userId: string, userRole: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: true,
        phase: {
          include: {
            project: true,
          },
        },
        task: {
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    // ADMIN pode deletar qualquer documento
    if (userRole === "ADMIN") {
      await prisma.document.delete({
        where: { id: documentId },
      });
      return { message: "Documento deletado com sucesso" };
    }

    // GERENTE pode deletar documentos do seu projeto
    let isManager = false;
    if (document.projectId) {
      isManager = document.project?.managerId === userId;
    } else if (document.phaseId) {
      isManager = document.phase?.project.managerId === userId;
    } else if (document.taskId) {
      isManager = document.task?.phase.project.managerId === userId;
    }

    // FUNCIONARIO só pode deletar seus próprios documentos de tarefa
    const isOwnTaskDocument =
      userRole === "FUNCIONARIO" &&
      document.taskId &&
      document.uploadedById === userId;

    if (!isManager && !isOwnTaskDocument) {
      throw new Error("Sem permissão para deletar este documento");
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return { message: "Documento deletado com sucesso" };
  }
}
