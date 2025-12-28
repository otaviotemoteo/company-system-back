export interface CreateTaskRequest {
  title: string;
  description?: string;
  phaseId: string;
  assignedToId?: string;
  priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  estimatedHours?: number;
  deadline?: Date;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assignedToId?: string;
  priority?: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  estimatedHours?: number;
  deadline?: Date;
}

export interface UpdateTaskStatusRequest {
  status:
    | "PENDENTE"
    | "EM_ANDAMENTO"
    | "EM_REVISAO"
    | "CONCLUIDA"
    | "BLOQUEADA";
}

export interface RegisterHoursRequest {
  hours: number;
  description?: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  workedHours: number;
  deadline?: Date;
  phaseId: string;
  assignedToId?: string;
  createdAt: Date;
  updatedAt: Date;
}
