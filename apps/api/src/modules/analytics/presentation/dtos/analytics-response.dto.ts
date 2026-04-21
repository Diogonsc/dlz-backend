import { ApiProperty } from '@nestjs/swagger';

/** Corpo persistido de `POST /analytics/events`. */
export class AnalyticsEventPersistedResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'page_view' })
  eventType!: string;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  payload!: Record<string, unknown>;

  @ApiProperty({ required: false, nullable: true })
  sessionId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AnalyticsDashboardResponseDto {
  @ApiProperty({ example: 12 })
  ordersToday!: number;

  @ApiProperty({ example: 340 })
  ordersMonth!: number;

  @ApiProperty({ example: 310 })
  ordersLastMonth!: number;

  @ApiProperty({ example: 15200.5, type: Number })
  revenueMonth!: number;

  @ApiProperty({ example: 14100.0, type: Number })
  revenueLastMonth!: number;

  @ApiProperty({ example: '7.8', nullable: true, description: 'Percentual string ou null' })
  revenueGrowth!: string | null;

  @ApiProperty({ example: 4 })
  pendingOrders!: number;
}

export class AnalyticsTopProductRowDto {
  @ApiProperty({ description: 'productId ou nome normalizado como chave' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 42 })
  qty!: number;

  @ApiProperty({ example: 840.0, type: Number })
  revenue!: number;
}

export class AnalyticsPeakHourRowDto {
  @ApiProperty({ example: 19, minimum: 0, maximum: 23 })
  hour!: number;

  @ApiProperty({ example: 28 })
  count!: number;
}

export class AnalyticsPriceSuggestionActionDto {
  @ApiProperty({ enum: ['increase', 'decrease', 'maintain'] })
  action!: string;

  @ApiProperty({ example: 5 })
  pct!: number;

  @ApiProperty()
  reason!: string;
}

export class AnalyticsPriceSuggestionRowDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  totalSold!: number;

  @ApiProperty({ type: Number })
  revenue!: number;

  @ApiProperty({ type: () => AnalyticsPriceSuggestionActionDto })
  suggestion!: AnalyticsPriceSuggestionActionDto;
}

export class AnalyticsMonthlySnapshotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: '2026-04' })
  month!: string;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty({ type: Number })
  totalRevenue!: number;

  @ApiProperty()
  newCustomers!: number;

  @ApiProperty({ type: 'object', additionalProperties: true, example: { topProducts: [] } })
  data!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
}
