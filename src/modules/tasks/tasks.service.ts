import { prisma } from "../../config/database";
import {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  RegisterHoursInput,
} from "./tasks.schemas";

export class TasksService {
  // Listar tarefas (filtrado por permissão e contexto)
  async findAll(
    userId: string,
    userRole: string,
    filters?: {
      phaseId?: string;
      projectId?: string;
      status?: string;
      assignedToId?: string;
    }
  ) {
    let where: any = {};

    // Filtros simples
    if (filters?.phaseId) where.phaseId = filters.phaseId;
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    // Lógica de permissão por role
    if (userRole === "FUNCIONARIO") {
      // Construir condição: tarefas atribuídas OU membro do projeto
      const accessConditions: any[] = [
        { assignedToId: userId }, // Tarefas atribuídas
        { phase: { project: { members: { some: { userId } } } } }, // Membro do projeto
      ];

      // Se já tem outros filtros no where, combinar com OR
      if (Object.keys(where).length > 0) {
        where = {
          ...where,
          phase: {
            project: {
              OR: [{ managerId: userId }, { members: { some: { userId } } }],
            },
          },
        };
      } else {
        // Sem outros filtros, usar OR direto
        where.OR = accessConditions;
      }
    } else if (userRole === "GERENTE") {
      // GERENTE vê apenas tarefas dos projetos que gerencia
      where.phase = {
        project: { managerId: userId },
      };
      if (filters?.projectId) {
        where.phase.projectId = filters.projectId;
      }
    } else if (userRole === "ADMIN") {
      // ADMIN vê tudo, apenas aplica filtros se houver
      if (filters?.projectId) {
        where.phase = { projectId: filters.projectId };
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                managerId: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
            documents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return tasks;
  }

  // Buscar tarefa por ID
  async findById(taskId: string, userId: string, userRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                managerId: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        documents: true,
      },
    });

    if (!task) {
      throw new Error("Tarefa não encontrada");
    }

    // Validar permissão
    if (userRole === "ADMIN") {
      // ADMIN pode acessar qualquer tarefa
    } else if (userRole === "GERENTE") {
      // GERENTE só acessa tarefas dos seus projetos
      const isManager = task.phase.project.managerId === userId;
      if (!isManager) {
        throw new Error("Sem permissão para acessar esta tarefa");
      }
    } else if (userRole === "FUNCIONARIO") {
      // FUNCIONARIO acessa se: atribuída a ele OU membro do projeto
      const isAssigned = task.assignedToId === userId;
      const isMember = await prisma.projectMember.findFirst({
        where: {
          userId: userId,
          projectId: task.phase.projectId,
        },
      });

      if (!isAssigned && !isMember) {
        throw new Error("Sem permissão para acessar esta tarefa");
      }
    }

    // Serializar apenas as datas, mantendo a estrutura original
    return {
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      deadline: task.deadline?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
      phase: {
        ...task.phase,
        createdAt: task.phase.createdAt.toISOString(),
        updatedAt: task.phase.updatedAt.toISOString(),
      },
      comments: task.comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      documents: task.documents.map((d) => ({
        ...d,
        createdAt: d.createdAt?.toISOString() || null,
        uploadedAt: d.createdAt?.toISOString() || null,
      })),
    };
  }

  // Criar tarefa (ADMIN ou GERENTE do projeto)
  async create(data: CreateTaskInput, userId: string, userRole: string) {
    // Verificar se fase existe
    const phase = await prisma.projectPhase.findUnique({
      where: { id: data.phaseId },
      include: {
        project: true,
      },
    });

    if (!phase) {
      throw new Error("Fase não encontrada");
    }

    // Validar permissão (ADMIN ou GERENTE do projeto)
    if (userRole !== "ADMIN" && phase.project.managerId !== userId) {
      throw new Error("Sem permissão para criar tarefas neste projeto");
    }

    // Se atribuir a alguém, verificar se é membro do projeto
    if (data.assignedToId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: data.assignedToId,
            projectId: phase.projectId,
          },
        },
      });

      if (!isMember && phase.project.managerId !== data.assignedToId) {
        throw new Error("Usuário não é membro deste projeto");
      }
    }

    // Criar tarefa
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        phaseId: data.phaseId,
        assignedToId: data.assignedToId,
        priority: data.priority || "MEDIA",
        estimatedHours: data.estimatedHours,
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return task;
  }

  // Atualizar tarefa (ADMIN ou GERENTE do projeto)
  async update(
    taskId: string,
    data: UpdateTaskInput,
    userId: string,
    userRole: string
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    // Validar permissão
    if (userRole !== "ADMIN" && task.phase.project.managerId !== userId) {
      throw new Error("Sem permissão para editar esta tarefa");
    }

    // Se mudar atribuição, validar
    if (data.assignedToId !== undefined) {
      if (data.assignedToId) {
        const isMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: data.assignedToId,
              projectId: task.phase.projectId,
            },
          },
        });

        if (!isMember && task.phase.project.managerId !== data.assignedToId) {
          throw new Error("Usuário não é membro deste projeto");
        }
      }
    }

    // Atualizar tarefa
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedTask;
  }

  // Atualizar status da tarefa (FUNCIONARIO atribuído, GERENTE ou ADMIN)
  async updateStatus(
    taskId: string,
    data: UpdateTaskStatusInput,
    userId: string,
    userRole: string
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    // Validar permissão
    const isManager =
      userRole === "ADMIN" || task.phase.project.managerId === userId;
    const isAssigned = task.assignedToId === userId;

    if (!isManager && !isAssigned) {
      throw new Error("Sem permissão para atualizar status desta tarefa");
    }

    // Atualizar status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: data.status,
        completedAt: data.status === "CONCLUIDA" ? new Date() : null,
      },
    });

    return updatedTask;
  }

  // Registrar horas trabalhadas (FUNCIONARIO atribuído)
  async registerHours(
    taskId: string,
    data: RegisterHoursInput,
    userId: string,
    userRole: string
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    // GERENTE do projeto pode registrar horas
    const isManager = task.phase.project.managerId === userId;
    const isAssigned = task.assignedToId === userId;

    if (!isManager && !isAssigned) {
      throw new Error(
        "Apenas o funcionário atribuído ou gerente do projeto pode registrar horas"
      );
    }

    // Atualizar horas trabalhadas
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        workedHours: task.workedHours + data.hours,
      },
    });

    return updatedTask;
  }

  // Deletar tarefa (ADMIN ou GERENTE do projeto)
  async delete(taskId: string, userId: string, userRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    if (userRole !== "ADMIN" && task.phase.project.managerId !== userId) {
      throw new Error("Sem permissão para deletar esta tarefa");
    }

    // Deletar tarefa
    await prisma.task.delete({
      where: { id: taskId },
    });
  }
}
