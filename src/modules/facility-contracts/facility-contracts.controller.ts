import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import {
  CreateFacilityContractDto,
  UpdateFacilityContractDto,
} from './dto/facility-contract.dto';
import { FacilityContractsService } from './facility-contracts.service';

@ApiTags('facility-contracts')
@ApiBearerAuth()
@Controller()
export class FacilityContractsController {
  constructor(private readonly contractsService: FacilityContractsService) {}

  @Get('facilities/:facilityId/contracts')
  @ApiOperation({ summary: 'Lista umów placówki' })
  findByFacility(
    @Param('facilityId') facilityId: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.contractsService.findByFacility(facilityId, user);
  }

  @Post('facilities/:facilityId/contracts')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Dodaj umowę placówki' })
  create(
    @Param('facilityId') facilityId: string,
    @Body() dto: CreateFacilityContractDto,
  ) {
    return this.contractsService.create(facilityId, dto);
  }

  @Patch('facility-contracts/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Aktualizuj umowę' })
  update(@Param('id') id: string, @Body() dto: UpdateFacilityContractDto) {
    return this.contractsService.update(id, dto);
  }

  @Delete('facility-contracts/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Usuń umowę' })
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
