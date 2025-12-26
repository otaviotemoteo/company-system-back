import { prisma } from "../../config/database";
import { hashPassword, comparePassword } from "../../shared/utils/password";
import { LoginInput, RegisterInput } from "./auth.schemas";
import { AuthResponse } from "./auth.types";

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || "FUNCIONARIO",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return {
      token: "", // filled in the handler
      user,
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Email ou senha inválidos");
    }

    if (!user.isActive) {
      throw new Error("Usuário desativado");
    }

    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error("Email ou senha inválidos");
    }

    return {
      token: "", // filled in the handler
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    if (!user.isActive) {
      throw new Error("Usuário desativado");
    }

    return user;
  }
}
