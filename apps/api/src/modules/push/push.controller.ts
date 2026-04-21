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
import { PushUnsubscribeDto } from './push-unsubscribe.dto';
import {
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiNoContentResponse,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import { PushBroadcastQueuedResponseDto, PushSubscriptionPersistedResponseDto } from './push-response.dto';

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  @ApiOperation({ operationId: 'pushSubscribe', summary: 'Registra subscription de push' })
  @ApiStandardErrorResponses()
  @ApiJsonCreatedResponse({ type: PushSubscriptionPersistedResponseDto, description: 'Subscription persistida' })
  subscribe(@TenantId() tenantId: string, @Body() dto: SubscribePushDto) {
    return this.pushService.subscribe(tenantId, dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'pushUnsubscribe', summary: 'Remove subscription de push' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiNoContentResponse('Subscription removida')
  unsubscribe(@TenantId() tenantId: string, @Body() dto: PushUnsubscribeDto) {
    return this.pushService.unsubscribe(dto.endpoint, tenantId);
  }

  @Post('send')
  @ApiOperation({ operationId: 'pushSendToTenant', summary: 'Envia push para todos os subscribers do tenant' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: PushBroadcastQueuedResponseDto, description: 'Resultado do broadcast' })
  send(@TenantId() tenantId: string, @Body() dto: SendPushDto) {
    return this.pushService.sendToTenant(tenantId, dto);
  }
}
