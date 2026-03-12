import { prisma } from "../../config/database";
import { getCache, setCache, invalidateCache, invalidatePattern } from "../../config/redis";
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from "./projects.schemas";

const TTL = 10 * 60; // 10 minutos

export class ProjectsService {
  // Listar projetos (filtrado por role)
  async findAll(userId: string, userRole: string) {
    const cacheKey = `projects:list:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    let result;

    // ADMIN vê todos os projetos
    if (userRole === "ADMIN") {
      result = await prisma.project.findMany({
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              phases: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // GERENTE vê apenas projetos onde é gerente
    else if (userRole === "GERENTE") {
      result = await prisma.project.findMany({
        where: {
          managerId: userId,
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              phases: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // FUNCIONARIO vê apenas projetos onde é membro
    else {
      result = await prisma.project.findMany({
        where: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              phases: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    await setCache(cacheKey, result, TTL);
    return result;
  }

  // Buscar projeto por ID (com validação de permissão)
  async findById(projectId: string, userId: string, userRole: string) {
    const cacheKey = `projects:detail:${projectId}`;
    const cached = await getCache(cacheKey);

    let project = cached as Awaited<ReturnType<typeof prisma.project.findUnique>> | null;

    if (!project) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          phases: {
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              documents: true,
            },
          },
        },
      });

      if (!project) {
        throw new Error("Projeto não encontrado");
      }

      await setCache(cacheKey, project, TTL);
    }

    // Validar permissão (sempre, mesmo com cache hit)
    if (userRole !== "ADMIN") {
      const isManager = project.managerId === userId;
      const isMember = project.members.some((m) => m.userId === userId);

      if (!isManager && !isMember) {
        throw new Error("Sem permissão para acessar este projeto");
      }
    }

    return project;
  }

  // Criar projeto (somente ADMIN)
  async create(data: CreateProjectInput) {
    // Verificar se o gerente existe e tem role GERENTE
    const manager = await prisma.user.findUnique({
      where: { id: data.managerId },
    });

    if (!manager) {
      throw new Error("Gerente não encontrado");
    }

    if (manager.role !== "GERENTE" && manager.role !== "ADMIN") {
      throw new Error("Usuário informado não é gerente");
    }

    const project = await prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIA",
        budget: data.budget,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        managerId: data.managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Novo projeto invalida todas as listas (qualquer usuário pode ter sua lista afetada)
    // e o dashboard admin (totalProjetos muda)
    await Promise.all([
      invalidatePattern("projects:list:*"),
      invalidateCache("dashboard:admin"),
      invalidateCache(`dashboard:gerente:${data.managerId}`),
    ]);

    return project;
  }

  // Atualizar projeto
  async update(
    projectId: string,
    data: UpdateProjectInput,
    userId: string,
    userRole: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão (ADMIN ou GERENTE do projeto)
    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para editar este projeto");
    }

    // Se está mudando o gerente, validar
    if (data.managerId && data.managerId !== project.managerId) {
      const newManager = await prisma.user.findUnique({
        where: { id: data.managerId },
      });

      if (!newManager) {
        throw new Error("Novo gerente não encontrado");
      }

      if (newManager.role !== "GERENTE" && newManager.role !== "ADMIN") {
        throw new Error("Usuário informado não é gerente");
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        budget: data.budget,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        managerId: data.managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await Promise.all([
      invalidateCache(`projects:detail:${projectId}`),
      invalidatePattern("projects:list:*"),
      invalidateCache("dashboard:admin"),
      invalidateCache(`dashboard:gerente:${project.managerId}`),
    ]);

    return updatedProject;
  }

  // Deletar projeto (somente ADMIN)
  async delete(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    await Promise.all([
      invalidateCache(`projects:detail:${projectId}`),
      invalidateCache(`projects:members:${projectId}`),
      invalidatePattern("projects:list:*"),
      invalidateCache("dashboard:admin"),
      invalidateCache(`dashboard:gerente:${project.managerId}`),
    ]);

    return { message: "Projeto deletado com sucesso" };
  }

  // Adicionar membro ao projeto (ADMIN ou GERENTE do projeto)
  async addMember(
    projectId: string,
    data: AddMemberInput,
    userId: string,
    userRole: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão
    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para adicionar membros");
    }

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Verificar se já é membro
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: data.userId,
          projectId: projectId,
        },
      },
    });

    if (existingMember) {
      throw new Error("Usuário já é membro deste projeto");
    }

    const member = await prisma.projectMember.create({
      data: {
        userId: data.userId,
        projectId: projectId,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Invalida o detail do projeto (membros mudaram) e a lista do novo membro
    await Promise.all([
      invalidateCache(`projects:detail:${projectId}`),
      invalidateCache(`projects:members:${projectId}`),
      invalidateCache(`projects:list:${data.userId}`),
      invalidateCache(`dashboard:funcionario:${data.userId}`),
    ]);

    return member;
  }

  // Remover membro do projeto
  async removeMember(
    projectId: string,
    memberId: string,
    userId: string,
    userRole: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão
    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para remover membros");
    }

    // Verificar se membro existe
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId: projectId,
        },
      },
    });

    if (!member) {
      throw new Error("Membro não encontrado neste projeto");
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId: projectId,
        },
      },
    });

    await Promise.all([
      invalidateCache(`projects:detail:${projectId}`),
      invalidateCache(`projects:members:${projectId}`),
      invalidateCache(`projects:list:${memberId}`),
      invalidateCache(`dashboard:funcionario:${memberId}`),
    ]);

    return { message: "Membro removido com sucesso" };
  }

  // Listar membros do projeto
  async getMembers(projectId: string, userId: string, userRole: string) {
    const cacheKey = `projects:members:${projectId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão
    if (userRole !== "ADMIN") {
      const isManager = project.managerId === userId;
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: projectId,
          },
        },
      });

      if (!isManager && !isMember) {
        throw new Error("Sem permissão para ver membros deste projeto");
      }
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await setCache(cacheKey, members, TTL);
    return members;
  }
}
