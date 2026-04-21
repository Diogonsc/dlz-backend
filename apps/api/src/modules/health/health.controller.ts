import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheckResponseDto } from '../../common/dtos/health-check-response.dto';
import {
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check da API (público)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: HealthCheckResponseDto, description: 'Status, uptime e ambiente' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }
}
