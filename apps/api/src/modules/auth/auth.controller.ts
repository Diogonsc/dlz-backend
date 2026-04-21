import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';
import {
  ApiAuthEndpoint,
  ApiJsonOkResponse,
  ApiNoContentResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
  ApiTooManyRequestsResponse,
} from '../../common/swagger/http-responses.decorators';

type LoginRequestUser = Parameters<AuthService['login']>[0];

@ApiTags('auth')
/** Só o throttler nomeado `auth` (ver `app.module` / `app.config`); evita 429 por `replay` (20/min) partilhado com o resto da API. */
@SkipThrottle({ short: true, long: true, webhook: true, replay: true })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiTooManyRequestsResponse('Muitas tentativas de login neste intervalo')
  @ApiOperation({ operationId: 'login', summary: 'Login com e-mail e senha (público)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: AuthSessionResponseDto, description: 'Sessão criada com access e refresh tokens' })
  async login(@Request() req: { user: LoginRequestUser }, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiPublicEndpoint()
  @ApiTooManyRequestsResponse('Muitas tentativas de cadastro neste intervalo')
  @ApiOperation({ operationId: 'register', summary: 'Cadastro de novo usuário (público)' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonOkResponse({ type: AuthSessionResponseDto, description: 'Usuário criado e sessão iniciada' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.displayName);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiTooManyRequestsResponse('Muitas tentativas de refresh neste intervalo')
  @ApiOperation({ operationId: 'refreshSession', summary: 'Renovar access token com refresh token (público)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: AuthSessionResponseDto, description: 'Nova sessão com tokens rotacionados' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'logout', summary: 'Revogar refresh token (logout) — requer JWT' })
  @ApiStandardErrorResponses()
  @ApiNoContentResponse('Refresh token revogado')
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }
}
