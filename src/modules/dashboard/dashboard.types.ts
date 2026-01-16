export interface AdminDashboard {
  totalUsuarios: number;
  totalProjetos: number;
  totalTarefas: number;
  totalDocumentos: number;
  usuariosPorRole: {
    role: string;
    count: number;
  }[];
  projetosPorStatus: {
    status: string;
    count: number;
  }[];
  tarefasPorStatus: {
    status: string;
    count: number;
  }[];
  projetosRecentes: {
    id: string;
    title: string;
    status: string;
    managerId: string;
    manager: {
      name: string;
    };
    createdAt: Date;
  }[];
  tarefasAtrasadas: number;
}

export interface GerenteDashboard {
  totalProjetos: number;
  totalTarefas: number;
  totalMembros: number;
  projetosPorStatus: {
    status: string;
    count: number;
  }[];
  tarefasPorStatus: {
    status: string;
    count: number;
  }[];
  tarefasAtrasadas: number;
  horasTrabalhadas: number;
  horasEstimadas: number;
  proximosDeadlines: {
    id: string;
    title: string;
    deadline: Date;
    assignedTo: {
      name: string;
    } | null;
  }[];
  meusProjetosRecentes: {
    id: string;
    title: string;
    status: string;
    _count: {
      phases: number;
      members: number;
    };
  }[];
}

export interface FuncionarioDashboard {
  minhasTarefas: {
    total: number;
    pendentes: number;
    emAndamento: number;
    emRevisao: number;
    concluidas: number;
    bloqueadas: number;
  };
  tarefasAtrasadas: number;
  horasTrabalhadas: number;
  horasEstimadas: number;
  proximosDeadlines: {
    id: string;
    title: string;
    deadline: Date;
    phase: {
      project: {
        title: string;
      };
    };
  }[];
  tarefasRecentes: {
    id: string;
    title: string;
    status: string;
    priority: string;
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  }[];
  projetosOndeEMembro: {
    id: string;
    title: string;
    manager: {
      name: string;
    };
  }[];
}
