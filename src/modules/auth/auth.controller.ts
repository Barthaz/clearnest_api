import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Logowanie użytkownika' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bieżąca sesja użytkownika' })
  me(@CurrentUser() user: AuthUserDto) {
    return {
      isAuthenticated: true,
      username: user.username,
      user,
      loginAt: new Date().toISOString(),
    };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Zmiana hasła bieżącego użytkownika' })
  changePassword(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Wylogowanie (JWT stateless)' })
  logout() {
    return { success: true };
  }
}
