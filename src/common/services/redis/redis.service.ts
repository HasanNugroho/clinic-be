import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private redis: Redis;
    private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
    private readonly logger = new Logger(RedisService.name);

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
        });

        this.redis.on('error', (error) => {
            this.logger.error('❌ Redis connection error:', error.message);
        });

        this.redis.on('connect', () => {
            this.logger.log('✅ Redis connected successfully');
        });
    }

    /**
     * Set a key-value pair in Redis with TTL
     */
    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            const serializedValue = JSON.stringify(value);
            const ttl = ttlSeconds || this.DEFAULT_TTL;

            await this.redis.setex(key, ttl, serializedValue);
            // this.logger.log(`💾 Redis cache set: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            this.logger.error('❌ Redis set error:', error.message);
        }
    }

    /**
     * Get a value from Redis by key
     */
    async get(key: string): Promise<any> {
        try {
            const value = await this.redis.get(key);
            if (value) {
                // this.logger.log(`📦 Redis cache hit: ${key}`);
                return JSON.parse(value);
            }
            // this.logger.log(`❌ Redis cache miss: ${key}`);
            return null;
        } catch (error) {
            this.logger.error('❌ Redis get error:', error.message);
            return null;
        }
    }

    /**
     * Get Redis keys matching a given pattern.
     */
    async keys(key: string): Promise<any> {
        try {
            const keys = await this.redis.keys(key);
            if (!keys || keys.length === 0) {
                return null; // Not found in cache
            }
            // this.logger.log(`❌ Redis cache miss: ${key}`);
            return keys;
        } catch (error) {
            this.logger.error('❌ Redis keys error:', error.message);
            return null;
        }
    }

    /**
     * Delete a key from Redis
     */
    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
            // this.logger.log(`🗑️ Redis cache deleted: ${key}`);
        } catch (error) {
            this.logger.error('❌ Redis delete error:', error.message);
        }
    }

    /**
     * Delete multiple keys from Redis
     */
    async delMany(keys: string[]): Promise<void> {
        try {
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            this.logger.error('❌ Redis delete error:', error.message);
        }
    }

    /**
     * Check if a key exists in Redis
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        } catch (error) {
            this.logger.error('❌ Redis exists error:', error.message);
            return false;
        }
    }

    /**
     * Set multiple key-value pairs in Redis
     */
    async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
        try {
            const ttl = ttlSeconds || this.DEFAULT_TTL;
            const pipeline = this.redis.pipeline();

            Object.entries(keyValuePairs).forEach(([key, value]) => {
                const serializedValue = JSON.stringify(value);
                pipeline.setex(key, ttl, serializedValue);
            });

            await pipeline.exec();
            // this.logger.log(`💾 Redis cache mset: ${Object.keys(keyValuePairs).length} keys (TTL: ${ttl}s)`);
        } catch (error) {
            this.logger.error('❌ Redis mset error:', error.message);
        }
    }

    /**
     * Get multiple values from Redis by keys
     */
    async mget(keys: string[]): Promise<Record<string, any>> {
        try {
            const values = await this.redis.mget(keys);
            const result: Record<string, any> = {};

            keys.forEach((key, index) => {
                if (values[index]) {
                    try {
                        result[key] = JSON.parse(values[index]);
                    } catch (parseError) {
                        this.logger.error(`❌ Redis parse error for key ${key}:`, parseError);
                    }
                }
            });

            const hitCount = Object.keys(result).length;
            // this.logger.log(`📦 Redis cache mget: ${hitCount}/${keys.length} hits`);

            return result;
        } catch (error) {
            this.logger.error('❌ Redis mget error:', error.message);
            return {};
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
        hitRate: number;
    }> {
        try {
            const info = await this.redis.info('memory');
            const totalKeys = await this.redis.dbsize();

            // Extract memory usage from info
            const memoryMatch = info.match(/used_memory_human:(\S+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

            return {
                totalKeys,
                memoryUsage,
                hitRate: 0.85, // Placeholder - would need to track actual hits
            };
        } catch (error) {
            this.logger.error('❌ Redis stats error:', error.message);
            return {
                totalKeys: 0,
                memoryUsage: 'Unknown',
                hitRate: 0,
            };
        }
    }

    /**
     * Clear all cache entries
     */
    async flushAll(): Promise<void> {
        try {
            await this.redis.flushall();
            this.logger.log('🗑️ Redis cache flushed');
        } catch (error) {
            this.logger.error('❌ Redis flush error:', error.message);
        }
    }

    /**
     * Generate cache key for different layers
     */
    generateCacheKey(layer: string, data: any): string {
        const hash = this.hashString(JSON.stringify(data));
        return `itinerary:${layer}:${hash}`;
    }

    /**
     * Simple string hashing for cache keys
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Cleanup on module destroy
     */
    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
            this.logger.log('🔌 Redis connection closed');
        }
    }
}
