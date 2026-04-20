import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsUrl() avatarUrl?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  me(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Atualiza perfil do usuário autenticado' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
