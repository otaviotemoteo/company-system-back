import Redis from 'ioredis';
import { env } from './env';

// Singleton do Redis
let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Listeners pra debug
    redisClient.on('connect', () => {
      console.log('✅ Redis conectado com sucesso!');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Erro no Redis:', err);
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis pronto para uso!');
    });
  }

  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔌 Redis desconectado');
  }
};