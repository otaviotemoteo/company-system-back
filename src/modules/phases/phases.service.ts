import { prisma } from "../../config/database";
import { CreatePhaseInput, UpdatePhaseInput } from "./phases.schemas";

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

    // Listar fases ordenadas
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

    return phases;
  }

  // Buscar fase por ID
  async findById(phaseId: string, userId: string, userRole: string) {
    const phase = await prisma.projectPhase.findUnique({
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

    // Validar permissão
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
    // Verificar se projeto existe
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão (ADMIN ou GERENTE do projeto)
    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para criar fases neste projeto");
    }

    // Criar fase
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

    // Validar permissão
    if (userRole !== "ADMIN" && phase.project.managerId !== userId) {
      throw new Error("Sem permissão para editar esta fase");
    }

    // Atualizar fase
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

    // Validar permissão
    if (userRole !== "ADMIN" && phase.project.managerId !== userId) {
      throw new Error("Sem permissão para deletar esta fase");
    }

    // Deletar fase (cascade vai deletar tarefas e documentos)
    await prisma.projectPhase.delete({
      where: { id: phaseId },
    });

    return { message: "Fase deletada com sucesso" };
  }

  // Reordenar fases (ADMIN ou GERENTE do projeto)
  async reorder(
    projectId: string,
    phaseOrders: { phaseId: string; order: number }[],
    userId: string,
    userRole: string
  ) {
    // Verificar se projeto existe
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Projeto não encontrado");
    }

    // Validar permissão
    if (userRole !== "ADMIN" && project.managerId !== userId) {
      throw new Error("Sem permissão para reordenar fases deste projeto");
    }

    // Atualizar ordem de cada fase
    await prisma.$transaction(
      phaseOrders.map((item) =>
        prisma.projectPhase.update({
          where: { id: item.phaseId },
          data: { order: item.order },
        })
      )
    );

    // Retornar fases reordenadas
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return phases;
  }
}
