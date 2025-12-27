import { prisma } from "../../config/database";
import { hashPassword } from "../../shared/utils/password";
import { CreateUserInput, UpdateUserInput } from "./users.schemas";

export class UsersService {
  // Listar todos os usuários (com filtros opcionais)
  async findAll(filters?: { role?: string; isActive?: boolean }) {
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  }

  // Buscar usuário por ID
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    return user;
  }

  // Criar novo usuário (somente ADMIN)
  async create(data: CreateUserInput) {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // Atualizar usuário
  async update(id: string, data: UpdateUserInput) {
    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error("Usuário não encontrado");
    }

    // Se está atualizando email, verificar se já existe
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new Error("Email já cadastrado");
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
    };

    // Se está atualizando senha, fazer hash
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    // Atualizar usuário
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // Deletar usuário (soft delete - apenas desativa)
  async delete(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Soft delete - desativa e marca data de exclusão
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { message: "Usuário desativado com sucesso" };
  }
}
