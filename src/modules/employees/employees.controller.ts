import { Controller, Get, Param, Patch, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Lista pracowników' })
  findAll() {
    return this.employeesService.findAll();
  }

  @Get('me')
  @Roles('WORKER')
  @ApiOperation({ summary: 'Profil bieżącego pracownika' })
  findMe(@CurrentUser() user: AuthUserDto) {
    return this.employeesService.findMe(user);
  }

  @Get('me/earnings')
  @Roles('WORKER')
  @ApiOperation({ summary: 'Zarobki bieżącego pracownika w miesiącu' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getMyEarnings(
    @CurrentUser() user: AuthUserDto,
    @Query('month') month: string,
  ) {
    return this.employeesService.getMyEarnings(user, month);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Szczegóły pracownika' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Utwórz pracownika' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Aktualizuj pracownika' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Usuń pracownika' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
