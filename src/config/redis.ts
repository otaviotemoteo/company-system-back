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

// Cache helpers — padrão cache-aside
// Leitura: getCache → se null, query no banco → setCache
// Escrita: após salvar no banco, invalidateCache das chaves relacionadas

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await getRedisClient().get(key);
  return data ? (JSON.parse(data) as T) : null;
}

export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  await getRedisClient().set(key, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length > 0) await getRedisClient().del(...keys);
}

// Invalida todas as chaves que correspondem ao padrão (ex: "dashboard:gerente:*")
// Evitar em hot paths — redis.keys() escaneia todo o keyspace
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await getRedisClient().keys(pattern);
  if (keys.length > 0) await getRedisClient().del(...keys);
}