import Redis from "ioredis";
import { envVars } from "../config/env";

const redisClient = new Redis(envVars.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redisClient.on("connect", () => {
  console.log("🚀 Connected to Redis");
});

/**
 * Higher-level Redis wrapper for basic caching needs.
 */
class RedisService {
  /**
   * Set cache with TTL (in seconds)
   */
  public static async set(key: string, value: any, ttlSeconds: number = 300) {
    const data = JSON.stringify(value);
    await redisClient.setex(key, ttlSeconds, data);
  }

  /**
   * Get parsed JSON data
   */
  public static async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (err) {
      return null;
    }
  }

  /**
   * Remove specific key
   */
  public static async del(key: string) {
    await redisClient.del(key);
  }

  /**
   * Invalidate by pattern (e.g., 'mentors:*')
   */
  public static async delByPattern(pattern: string) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }

  /**
   * Close connection (for graceful shutdown)
   */
  public static async disconnect() {
    await redisClient.disconnect();
  }
}

export default RedisService;
