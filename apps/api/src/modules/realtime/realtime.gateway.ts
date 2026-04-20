import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import type {
  PaymentApprovedRealtimeEnvelope,
  PaymentFailedRealtimeEnvelope,
  SubscriptionCanceledRealtimeEnvelope,
  SubscriptionUpdatedRealtimeEnvelope,
} from '../payments/application/mappers/billing-realtime-payload.mapper';
import { StructuredLoggerService } from '../../common/observability/structured-logger.service';

type OrderRealtimeBusPayload = {
  order: unknown;
  tenantId: string;
  correlationId?: string | null;
};

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly structured: StructuredLoggerService,
  ) {}

  // ── Conexão / desconexão ──────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) { client.disconnect(); return; }

    try {
      const payload = this.jwt.verify(token) as {
        sub?: string;
        tenantId?: string;
        roles?: string[];
      };
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.data.roles = payload.roles ?? [];

      if (payload.tenantId) {
        client.join(`tenant:${payload.tenantId}`);
      }

      if ((payload.roles ?? []).includes('admin')) {
        client.join('admin');
      }

      this.structured.log({
        type: 'realtime',
        phase: 'connect',
        socketId: client.id,
        tenantId: payload.tenantId ?? null,
        userId: payload.sub ?? null,
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.structured.log({
      type: 'realtime',
      phase: 'disconnect',
      socketId: client.id,
      tenantId: client.data?.tenantId ?? null,
    });
  }

  // ── Mensagens do cliente ──────────────────────────────────────────────────

  @SubscribeMessage('join:store')
  joinStore(@ConnectedSocket() client: Socket, @MessageBody() tenantId: string) {
    if (!tenantId || client.data?.tenantId !== tenantId) {
      return { error: 'forbidden_tenant' };
    }
    client.join(`store:${tenantId}`);
    return { joined: tenantId };
  }

  // ── Pedidos (contrato Socket inalterado: body = order) ─────────────────────

  @OnEvent('order.created')
  handleOrderCreated(payload: OrderRealtimeBusPayload) {
    const { order, tenantId, correlationId } = payload;
    this.server.to(`tenant:${tenantId}`).emit('order:new', order);
    this.server.to('admin').emit('order:new', { ...(order as object), tenantId });
    this.structured.log({
      type: 'realtime',
      socketEvent: 'order:new',
      tenantId,
      correlationId: correlationId ?? null,
    });
  }

  @OnEvent('order.status_changed')
  handleOrderStatusChanged(payload: OrderRealtimeBusPayload) {
    const { order, tenantId, correlationId } = payload;
    this.server.to(`tenant:${tenantId}`).emit('order:updated', order);
    this.server.to(`store:${tenantId}`).emit('order:updated', order);
    this.structured.log({
      type: 'realtime',
      socketEvent: 'order:updated',
      tenantId,
      correlationId: correlationId ?? null,
      status:
        typeof order === 'object' && order !== null && 'status' in order
          ? String((order as { status: unknown }).status)
          : undefined,
    });
  }

  // ── Broadcast manual (usado por outros serviços) ──────────────────────────

  broadcastToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  @OnEvent('tab.created')
  handleTabCreated(payload: { tab: unknown; tenantId: string; correlationId?: string | null }) {
    const { tab, tenantId, correlationId } = payload;
    this.server.to(`tenant:${tenantId}`).emit('tabs:updated', { event: 'INSERT', new: tab });
    this.structured.log({
      type: 'realtime',
      socketEvent: 'tabs:updated',
      tenantId,
      correlationId: correlationId ?? null,
      tabEvent: 'INSERT',
    });
  }

  @OnEvent('tab.updated')
  handleTabUpdated(payload: { tab: unknown; tenantId: string; correlationId?: string | null }) {
    const { tab, tenantId, correlationId } = payload;
    this.server.to(`tenant:${tenantId}`).emit('tabs:updated', { event: 'UPDATE', new: tab });
    this.structured.log({
      type: 'realtime',
      socketEvent: 'tabs:updated',
      tenantId,
      correlationId: correlationId ?? null,
      tabEvent: 'UPDATE',
    });
  }

  // ── Billing ────────────────────────────────────────────────────────────────

  @OnEvent('payment.approved')
  handlePaymentApproved(envelope: PaymentApprovedRealtimeEnvelope) {
    const tenantId = envelope?.data?.tenantId;
    if (!tenantId) return;
    this.server.to(`tenant:${tenantId}`).emit('payment:approved', envelope);
    this.structured.log({
      type: 'realtime',
      socketEvent: 'payment:approved',
      tenantId,
      correlationId: envelope.correlationId ?? null,
      billingType: envelope.type,
    });
  }

  @OnEvent('payment.failed')
  handlePaymentFailed(envelope: PaymentFailedRealtimeEnvelope) {
    const tenantId = envelope?.data?.tenantId;
    if (!tenantId) return;
    this.server.to(`tenant:${tenantId}`).emit('payment:failed', envelope);
    this.structured.log({
      type: 'realtime',
      socketEvent: 'payment:failed',
      tenantId,
      correlationId: envelope.correlationId ?? null,
      billingType: envelope.type,
    });
  }

  @OnEvent('subscription.updated')
  handleSubscriptionUpdated(envelope: SubscriptionUpdatedRealtimeEnvelope) {
    const tenantId = envelope?.data?.tenantId;
    if (!tenantId) return;
    this.server.to(`tenant:${tenantId}`).emit('subscription:updated', envelope);
    this.structured.log({
      type: 'realtime',
      socketEvent: 'subscription:updated',
      tenantId,
      correlationId: envelope.correlationId ?? null,
      billingType: envelope.type,
    });
  }

  @OnEvent('subscription.canceled')
  handleSubscriptionCanceled(envelope: SubscriptionCanceledRealtimeEnvelope) {
    const tenantId = envelope?.data?.tenantId;
    if (!tenantId) return;
    this.server.to(`tenant:${tenantId}`).emit('subscription:canceled', envelope);
    this.structured.log({
      type: 'realtime',
      socketEvent: 'subscription:canceled',
      tenantId,
      correlationId: envelope.correlationId ?? null,
      billingType: envelope.type,
    });
  }
}
