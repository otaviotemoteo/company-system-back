export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "GERENTE" | "FUNCIONARIO";
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: "ADMIN" | "GERENTE" | "FUNCIONARIO";
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
