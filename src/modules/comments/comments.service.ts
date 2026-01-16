import { prisma } from "../../config/database";
import { CreateCommentInput, UpdateCommentInput } from "./comments.schemas";

export class CommentsService {
  // Listar comentários de uma tarefa
  async findByTask(taskId: string, userId: string, userRole: string) {
    // Verificar se tarefa existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarefa não encontrada");
    }

    // Validar permissão (membros do projeto podem ver comentários)
    if (userRole !== "ADMIN") {
      const isManager = task.phase.project.managerId === userId;
      const isAssigned = task.assignedToId === userId;
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: task.phase.projectId,
          },
        },
      });

      if (!isManager && !isAssigned && !isMember) {
        throw new Error("Sem permissão para ver comentários desta tarefa");
      }
    }

    // Listar comentários
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return comments;
  }

  // Criar comentário
  async create(data: CreateCommentInput, userId: string, userRole: string) {
    // Verificar se tarefa existe
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarefa não encontrada");
    }

    // Validar permissão (membros do projeto podem comentar)
    if (userRole !== "ADMIN") {
      const isManager = task.phase.project.managerId === userId;
      const isAssigned = task.assignedToId === userId;
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: task.phase.projectId,
          },
        },
      });

      if (!isManager && !isAssigned && !isMember) {
        throw new Error("Sem permissão para comentar nesta tarefa");
      }
    }

    // Criar comentário
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: data.taskId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return comment;
  }

  // Atualizar comentário (apenas autor)
  async update(commentId: string, data: UpdateCommentInput, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error("Comentário não encontrado");
    }

    // Apenas o autor pode editar
    if (comment.authorId !== userId) {
      throw new Error("Apenas o autor pode editar o comentário");
    }

    // Atualizar comentário
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: data.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedComment;
  }

  // Deletar comentário (autor ou ADMIN)
  async delete(commentId: string, userId: string, userRole: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error("Comentário não encontrado");
    }

    // Apenas autor ou ADMIN pode deletar
    if (userRole !== "ADMIN" && comment.authorId !== userId) {
      throw new Error("Apenas o autor ou ADMIN pode deletar o comentário");
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return { message: "Comentário deletado com sucesso" };
  }
}
