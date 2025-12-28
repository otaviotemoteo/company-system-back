export interface CreatePhaseRequest {
  name: string;
  description?: string;
  projectId: string;
  order: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdatePhaseRequest {
  name?: string;
  description?: string;
  order?: number;
  status?: "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "BLOQUEADA";
  startDate?: Date;
  endDate?: Date;
}

export interface PhaseResponse {
  id: string;
  name: string;
  description?: string;
  order: number;
  status: string;
  startDate?: Date;
  endDate?: Date;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}
