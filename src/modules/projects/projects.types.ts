export interface CreateProjectRequest {
  title: string;
  description?: string;
  managerId: string;
  priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  managerId?: string;
  status?:
    | "PLANEJAMENTO"
    | "EM_ANDAMENTO"
    | "EM_PAUSA"
    | "CONCLUIDO"
    | "CANCELADO";
  priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
}

export interface AddMemberRequest {
  userId: string;
  role: string; // Ex: "Desenvolvedor", "Designer"
}

export interface ProjectResponse {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  managerId: string;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
