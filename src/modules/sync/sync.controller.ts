import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import { SyncService } from './sync.service';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('revisions')
  @ApiOperation({ summary: 'Metadane wersji danych do synchronizacji' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getRevisions(
    @Query('month') month: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.syncService.getRevisions(month, user);
  }
}
