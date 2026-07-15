import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/roles.decorator';
import { renderHealthPage } from './health-page.template';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Status serwera (HTML lub JSON)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json'] })
  @Header('Cache-Control', 'no-store')
  async check(
    @Req() req: Request,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    const data = await this.healthService.getStatus();
    const wantsJson =
      format === 'json' ||
      (req.headers.accept?.includes('application/json') &&
        !req.headers.accept?.includes('text/html'));

    if (wantsJson) {
      return res.status(data.status === 'ok' ? 200 : 503).json(data);
    }

    const logoUrl = '/public/logo.png';
    res.status(data.status === 'ok' ? 200 : 503);
    res.type('html').send(renderHealthPage(data, logoUrl));
  }
}
