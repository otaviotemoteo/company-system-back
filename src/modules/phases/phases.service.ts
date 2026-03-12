import { prisma } from "../../config/database";
import { getCache, setCache, invalidateCache } from "../../config/redis";
import { CreatePhaseInput, UpdatePhaseInput } from "./phases.schemas";

const TTL = 15 * 60; // 15 minutos

export class PhasesService {
  // Listar fases de um projeto (com validação de permissão)
  async findByProject(projectId: string, userId: string, userRole: string) {
    // Verificar se projeto existe
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
        throw new Error("Sem permissão para acessar fases deste projeto");
      }
    }

    const cacheKey = `phases:project:${projectId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      include: {
        _count: {
          select: {
            tasks: true,
            documents: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    await setCache(cacheKey, phases, TTL);
    return phases;
  }

  // Buscar fase por ID
  async findById(phaseId: string, userId: string, userRole: string) {
    const cacheKey = `phases:detail:${phaseId}`;
    const cached = await getCache(cacheKey);

    let phase = cached as Awaited<ReturnType<typeof prisma.projectPhase.findUnique>> | null;

    if (!phase) {
      phase = await prisma.projectPhase.findUnique({
        where: { id: phaseId },
        include: {
          project: true,
          tasks: {
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              documents: true,
            },
          },
        },
      });

      if (!phase) {
        throw new Error("Fase não encontrada");
      }

      await setCache(cacheKey, phase, TTL);
    }

    // Validar permissão (sempre, mesmo com cache hit)
    if (userRole !== "ADMIN") {
      const isManager = phase.project.managerId === userId;
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: phase.projectId,
          },
        },
      });

      if (!isManager && !isMember) {
        throw new Error("Sem permissão para acessar esta fase");
      }
    }

    return phase;
  }

  // Criar fase (ADMIN ou GERENTE do projeto)
  async create(data: CreatePhaseInput, userId: string, userRole: string) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para criar fases neste projeto");
    }

    const phase = await prisma.projectPhase.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        order: data.order,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    // Nova fase invalida a lista de fases do projeto e o detail do projeto
    await Promise.all([
      invalidateCache(`phases:project:${data.projectId}`),
      invalidateCache(`projects:detail:${data.projectId}`),
    ]);

    return phase;
  }

  // Atualizar fase (ADMIN ou GERENTE do projeto)
  async update(
    phaseId: string,
    data: UpdatePhaseInput,
    userId: string,
    userRole: string
  ) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: {
        project: true,
      },
    });

    if (!phase) {
      throw new Error("Fase não encontrada");
    }

    if (userRole !== "ADMIN" && phase.project.managerId !== userId) {
      throw new Error("Sem permissão para editar esta fase");
    }

    const updatedPhase = await prisma.projectPhase.update({
      where: { id: phaseId },
      data: {
        name: data.name,
        description: data.description,
        order: data.order,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    await Promise.all([
      invalidateCache(`phases:detail:${phaseId}`),
      invalidateCache(`phases:project:${phase.projectId}`),
    ]);

    return updatedPhase;
  }

  // Deletar fase (ADMIN ou GERENTE do projeto)
  async delete(phaseId: string, userId: string, userRole: string) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: {
        project: true,
      },
    });

    if (!phase) {
      throw new Error("Fase não encontrada");
    }

    if (userRole !== "ADMIN" && phase.project.managerId !== userId) {
      throw new Error("Sem permissão para deletar esta fase");
    }

    await prisma.projectPhase.delete({
      where: { id: phaseId },
    });

    await Promise.all([
      invalidateCache(`phases:detail:${phaseId}`),
      invalidateCache(`phases:project:${phase.projectId}`),
      invalidateCache(`projects:detail:${phase.projectId}`),
    ]);

    return { message: "Fase deletada com sucesso" };
  }

  // Reordenar fases (ADMIN ou GERENTE do projeto)
  async reorder(
    projectId: string,
    phaseOrders: { phaseId: string; order: number }[],
    userId: string,
    userRole: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para reordenar fases deste projeto");
    }

    await prisma.$transaction(
      phaseOrders.map((item) =>
        prisma.projectPhase.update({
          where: { id: item.phaseId },
          data: { order: item.order },
        })
      )
    );

    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    // Invalida a lista de fases — ordem mudou
    await invalidateCache(`phases:project:${projectId}`);

    return phases;
  }
}
