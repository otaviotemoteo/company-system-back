export interface UploadDocumentRequest {
  name: string;
  type: "CONTRATO" | "ESPECIFICACAO" | "RELATORIO" | "ENTREGA" | "OUTRO";
  description?: string;
  projectId?: string;
  phaseId?: string;
  taskId?: string;
  fileUrl: string;
  fileSize: number;
}

export interface DocumentResponse {
  id: string;
  name: string;
  type: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  uploadedById: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  projectId?: string;
  phaseId?: string;
  taskId?: string;
  createdAt: Date;
}
