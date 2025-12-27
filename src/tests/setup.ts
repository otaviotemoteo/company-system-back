import { config } from "dotenv";
import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "../config/database";

config({ path: ".env.test" });

beforeAll(async () => {
  console.log("🧪 Iniciando testes...");
});

afterEach(async () => {
  // Deletar todos os dados (na ordem correta por causa das FKs)
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectPhase.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log("✅ Testes finalizados!");
});
