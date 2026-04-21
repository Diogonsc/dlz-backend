import { ApiProperty } from '@nestjs/swagger';

/** Resposta de `POST /signup/store`. */
export class StoreSignupFlowResponseDto {
  @ApiProperty({ required: false, example: true, description: 'Fluxo completo de criação' })
  success?: boolean;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ required: false, example: 'minha-loja' })
  slug?: string;

  @ApiProperty({ required: false, example: 'minha-loja' })
  subdomain?: string;

  @ApiProperty({ example: 'https://pay.cakto.com.br/...' })
  checkoutUrl!: string;

  @ApiProperty({ example: false, description: 'true quando reutiliza tenant pending_payment' })
  resumed!: boolean;
}
