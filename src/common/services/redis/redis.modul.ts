import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis Module
 * 
 * Provides Redis caching functionality for the application.
 * Features:
 * - Multi-layer caching for itinerary generation
 * - Configurable TTL for different cache layers
 * - Cache statistics and monitoring
 * - Automatic connection management
 */
@Module({
    imports: [ConfigModule],
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule { }
