import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { DomainsService } from '../../application/services/domains.service';
import { ManageDomainDto } from '../dtos/manage-domain.dto';

@ApiTags('domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status do domínio da loja (subdomain + custom domain)' })
  status(@TenantId() tenantId: string) {
    return this.domainsService.getStatus(tenantId);
  }

  @Post('manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerencia domínio customizado via Vercel API (add/remove/verify)' })
  manage(@TenantId() tenantId: string, @Body() dto: ManageDomainDto) {
    return this.domainsService.manage(tenantId, dto.action, dto.domain);
  }
}
