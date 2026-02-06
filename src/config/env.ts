import { config } from "dotenv";
import { z } from "zod";

// Carregar variáveis de ambiente
config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  
  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);