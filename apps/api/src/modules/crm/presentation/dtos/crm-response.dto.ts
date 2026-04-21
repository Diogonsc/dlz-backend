import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../common/dtos/pagination.dto';

export class CrmCustomerProfileRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'Maria' })
  name!: string;

  @ApiProperty({ example: '+55 11 99999-9999' })
  phone!: string;

  @ApiProperty()
  phoneNormalized!: string;

  @ApiProperty({ required: false, nullable: true })
  email!: string | null;

  @ApiProperty({ example: 3 })
  totalOrders!: number;

  @ApiProperty({ example: 189.9, type: Number })
  totalSpent!: number;

  @ApiProperty({ nullable: true })
  lastOrderAt!: Date | null;

  @ApiProperty({ example: 'recurring' })
  segment!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CrmCustomersListResponseDto {
  @ApiProperty({ type: [CrmCustomerProfileRowDto] })
  data!: CrmCustomerProfileRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class CrmTopSpenderRowDto {
  @ApiProperty({ example: 'João' })
  name!: string;

  @ApiProperty({ example: 1200.5, type: Number })
  totalSpent!: number;

  @ApiProperty({ example: 24 })
  totalOrders!: number;
}

export class CrmMetricsResponseDto {
  @ApiProperty({ example: 400 })
  total!: number;

  @ApiProperty({ example: 80 })
  newCustomers!: number;

  @ApiProperty({ example: 120 })
  recurring!: number;

  @ApiProperty({ type: [CrmTopSpenderRowDto] })
  topSpenders!: CrmTopSpenderRowDto[];

  @ApiProperty({ example: 45.2, description: 'Ticket médio (totalSpent médio)', type: Number })
  avgTicket!: number;
}

export class CrmCustomerOrderMiniDto {
  @ApiProperty({ example: 'DLZ-001' })
  orderCode!: string;

  @ApiProperty({ example: 'delivered' })
  status!: string;

  @ApiProperty({ example: 89.9, type: Number })
  total!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class CrmCustomerDetailResponseDto extends CrmCustomerProfileRowDto {
  @ApiProperty({ type: [CrmCustomerOrderMiniDto] })
  orders!: CrmCustomerOrderMiniDto[];
}

export class CrmResegmentJobResponseDto {
  @ApiProperty({ example: 150, description: 'Clientes considerados no recálculo' })
  resegmented!: number;
}
