import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiAuthEndpoint,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import { UserMeResponseDto } from './dtos/user-response.dto';

class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.exemplo.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@ApiAuthEndpoint()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ operationId: 'getCurrentUser', summary: 'Retorna dados do usuário autenticado' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: UserMeResponseDto,
    description: 'Usuário com roles e tenant',
  })
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me/profile')
  @ApiOperation({ operationId: 'updateCurrentUserProfile', summary: 'Atualiza perfil do usuário autenticado' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: UserMeResponseDto,
    description: 'Perfil atualizado',
  })
  updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
