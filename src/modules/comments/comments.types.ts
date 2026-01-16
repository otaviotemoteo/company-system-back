export interface CreateCommentRequest {
  content: string;
  taskId: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
}
