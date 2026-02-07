import { getRedisClient } from '../../config/redis';

export interface CacheOptions {
  ttl?: number; // Time to live em SEGUNDOS (padrão: 5 minutos)
}

export class CacheHelper {
  private redis = getRedisClient();

  /**
   * Busca valor do cache
   * @param key Chave do cache
   * @returns Objeto parseado ou null se não existir
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`❌ Erro ao buscar cache [${key}]:`, error);
      return null; // Em caso de erro, retorna null (não quebra a aplicação)
    }
  }

  /**
   * Salva valor no cache
   * @param key Chave do cache
   * @param value Valor a ser salvo (será convertido pra JSON)
   * @param options Opções (ttl em segundos)
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || 300; // Padrão: 5 minutos
      const serialized = JSON.stringify(value);
      
      await this.redis.set(key, serialized, 'EX', ttl);
      
      console.log(`✅ Cache salvo [${key}] - TTL: ${ttl}s`);
    } catch (error) {
      console.error(`❌ Erro ao salvar cache [${key}]:`, error);
    }
  }

  /**
   * Deleta uma chave específica
   * @param key Chave a ser deletada
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`🗑️  Cache deletado [${key}]`);
    } catch (error) {
      console.error(`❌ Erro ao deletar cache [${key}]:`, error);
    }
  }

  /**
   * Deleta múltiplas chaves por padrão (usando wildcards)
   * @param pattern Padrão (ex: "dashboard:*", "projects:user:123:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`ℹ️  Nenhuma chave encontrada para padrão [${pattern}]`);
        return;
      }

      await this.redis.del(...keys);
      console.log(`🗑️  ${keys.length} chaves deletadas [${pattern}]`);
    } catch (error) {
      console.error(`❌ Erro ao deletar padrão [${pattern}]:`, error);
    }
  }

  /**
   * Verifica se uma chave existe
   * @param key Chave a verificar
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ Erro ao verificar existência [${key}]:`, error);
      return false;
    }
  }

  /**
   * Obtém o tempo restante (TTL) de uma chave
   * @param key Chave
   * @returns Segundos restantes ou -1 se não existir
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`❌ Erro ao buscar TTL [${key}]:`, error);
      return -1;
    }
  }

  /**
   * Limpa TODOS os caches (use com cuidado!)
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      console.log('🧹 Todos os caches limpos!');
    } catch (error) {
      console.error('❌ Erro ao limpar caches:', error);
    }
  }
}

// Exporta instância singleton
export const cache = new CacheHelper();