import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { HealthStatus } from './health.types';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getStatus(): Promise<HealthStatus> {
    const database = await this.checkDatabase();

    return {
      status: database.connected ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      database,
      api: {
        version: this.configService.get<string>('apiVersion') ?? '1',
      },
    };
  }

  private async checkDatabase(): Promise<HealthStatus['database']> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        connected: true,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        connected: false,
        latencyMs: null,
      };
    }
  }

  private getUptime(): HealthStatus['uptime'] {
    const seconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return { seconds, formatted: parts.join(' ') };
  }
}
