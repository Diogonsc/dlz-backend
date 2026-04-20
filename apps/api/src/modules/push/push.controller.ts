import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import { SubscribePushDto, SendPushDto } from './push.dto';

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Registra subscription de push' })
  subscribe(@TenantId() tenantId: string, @Body() dto: SubscribePushDto) {
    return this.pushService.subscribe(tenantId, dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove subscription de push' })
  unsubscribe(@TenantId() tenantId: string, @Body('endpoint') endpoint: string) {
    return this.pushService.unsubscribe(endpoint, tenantId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Envia push para todos os subscribers do tenant' })
  send(@TenantId() tenantId: string, @Body() dto: SendPushDto) {
    return this.pushService.sendToTenant(tenantId, dto);
  }
}
