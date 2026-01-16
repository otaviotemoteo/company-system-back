import { prisma } from "../../config/database";

export class DashboardService {
  // Dashboard para ADMIN
  async getAdminDashboard() {
    // Total de usuários
    const totalUsuarios = await prisma.user.count();

    // Total de projetos
    const totalProjetos = await prisma.project.count();

    // Total de tarefas
    const totalTarefas = await prisma.task.count();

    // Total de documentos
    const totalDocumentos = await prisma.document.count();

    // Usuários por role
    const usuariosPorRole = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    // Projetos por status
    const projetosPorStatus = await prisma.project.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    // Tarefas por status
    const tarefasPorStatus = await prisma.task.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    // Projetos recentes (últimos 5)
    const projetosRecentes = await prisma.project.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        manager: {
          select: {
            name: true,
          },
        },
      },
    });

    // Tarefas atrasadas (deadline passou e não estão concluídas)
    const tarefasAtrasadas = await prisma.task.count({
      where: {
        deadline: {
          lt: new Date(),
        },
        status: {
          not: "CONCLUIDA",
        },
      },
    });

    return {
      totalUsuarios,
      totalProjetos,
      totalTarefas,
      totalDocumentos,
      usuariosPorRole: usuariosPorRole.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      projetosPorStatus: projetosPorStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      tarefasPorStatus: tarefasPorStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      projetosRecentes,
      tarefasAtrasadas,
    };
  }

  // Dashboard para GERENTE
  async getGerenteDashboard(userId: string) {
    // Total de projetos do gerente
    const totalProjetos = await prisma.project.count({
      where: {
        managerId: userId,
      },
    });

    // Total de tarefas dos projetos do gerente
    const totalTarefas = await prisma.task.count({
      where: {
        phase: {
          project: {
            managerId: userId,
          },
        },
      },
    });

    // Total de membros únicos nos projetos do gerente
    const totalMembros = await prisma.projectMember.groupBy({
      by: ["userId"],
      where: {
        project: {
          managerId: userId,
        },
      },
      _count: {
        userId: true,
      },
    });

    // Projetos por status
    const projetosPorStatus = await prisma.project.groupBy({
      by: ["status"],
      where: {
        managerId: userId,
      },
      _count: {
        status: true,
      },
    });

    // Tarefas por status
    const tarefasPorStatus = await prisma.task.groupBy({
      by: ["status"],
      where: {
        phase: {
          project: {
            managerId: userId,
          },
        },
      },
      _count: {
        status: true,
      },
    });

    // Tarefas atrasadas
    const tarefasAtrasadas = await prisma.task.count({
      where: {
        phase: {
          project: {
            managerId: userId,
          },
        },
        deadline: {
          lt: new Date(),
        },
        status: {
          not: "CONCLUIDA",
        },
      },
    });

    // Horas trabalhadas e estimadas
    const horasData = await prisma.task.aggregate({
      where: {
        phase: {
          project: {
            managerId: userId,
          },
        },
      },
      _sum: {
        workedHours: true,
        estimatedHours: true,
      },
    });

    // Próximos deadlines (próximos 5)
    const proximosDeadlines = await prisma.task.findMany({
      where: {
        phase: {
          project: {
            managerId: userId,
          },
        },
        deadline: {
          gte: new Date(),
        },
        status: {
          not: "CONCLUIDA",
        },
      },
      take: 5,
      orderBy: {
        deadline: "asc",
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    });

    // Projetos recentes do gerente
    const meusProjetosRecentes = await prisma.project.findMany({
      where: {
        managerId: userId,
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            phases: true,
            members: true,
          },
        },
      },
    });

    return {
      totalProjetos,
      totalTarefas,
      totalMembros: totalMembros.length,
      projetosPorStatus: projetosPorStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      tarefasPorStatus: tarefasPorStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      tarefasAtrasadas,
      horasTrabalhadas: horasData._sum.workedHours || 0,
      horasEstimadas: horasData._sum.estimatedHours || 0,
      proximosDeadlines,
      meusProjetosRecentes,
    };
  }

  // Dashboard para FUNCIONARIO
  async getFuncionarioDashboard(userId: string) {
    // Total de tarefas atribuídas
    const totalMinhasTarefas = await prisma.task.count({
      where: {
        assignedToId: userId,
      },
    });

    // Tarefas por status
    const tarefasPorStatus = await prisma.task.groupBy({
      by: ["status"],
      where: {
        assignedToId: userId,
      },
      _count: {
        status: true,
      },
    });

    // Converter para objeto com contadores
    const statusCounts = {
      PENDENTE: 0,
      EM_ANDAMENTO: 0,
      EM_REVISAO: 0,
      CONCLUIDA: 0,
      BLOQUEADA: 0,
    };

    tarefasPorStatus.forEach((item) => {
      statusCounts[item.status as keyof typeof statusCounts] =
        item._count.status;
    });

    // Tarefas atrasadas
    const tarefasAtrasadas = await prisma.task.count({
      where: {
        assignedToId: userId,
        deadline: {
          lt: new Date(),
        },
        status: {
          not: "CONCLUIDA",
        },
      },
    });

    // Horas trabalhadas e estimadas
    const horasData = await prisma.task.aggregate({
      where: {
        assignedToId: userId,
      },
      _sum: {
        workedHours: true,
        estimatedHours: true,
      },
    });

    // Próximos deadlines
    const proximosDeadlines = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        deadline: {
          gte: new Date(),
        },
        status: {
          not: "CONCLUIDA",
        },
      },
      take: 5,
      orderBy: {
        deadline: "asc",
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        phase: {
          select: {
            project: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    // Tarefas recentes
    const tarefasRecentes = await prisma.task.findMany({
      where: {
        assignedToId: userId,
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        phase: {
          select: {
            name: true,
            project: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    // Projetos onde é membro
    const projetosOndeEMembro = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        manager: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      minhasTarefas: {
        total: totalMinhasTarefas,
        pendentes: statusCounts.PENDENTE,
        emAndamento: statusCounts.EM_ANDAMENTO,
        emRevisao: statusCounts.EM_REVISAO,
        concluidas: statusCounts.CONCLUIDA,
        bloqueadas: statusCounts.BLOQUEADA,
      },
      tarefasAtrasadas,
      horasTrabalhadas: horasData._sum.workedHours || 0,
      horasEstimadas: horasData._sum.estimatedHours || 0,
      proximosDeadlines,
      tarefasRecentes,
      projetosOndeEMembro,
    };
  }
}
