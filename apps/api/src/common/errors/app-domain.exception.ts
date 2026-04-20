import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exceção de domínio mapeável para HTTP sem acoplar regras ao framework em todo o código.
 * Use em use cases quando quiser códigos estáveis para clients (ex.: ORDER_CLOSED).
 */
export class AppDomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super(details ? { code, message, details } : { code, message }, httpStatus);
  }
}
