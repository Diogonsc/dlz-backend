import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emit(tenantId: string, event: string, data: any) {
    this.gateway.broadcastToTenant(tenantId, event, data);
  }

  emitAll(event: string, data: any) {
    this.gateway.broadcastToAll(event, data);
  }
}
