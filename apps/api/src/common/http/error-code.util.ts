import { HttpStatus } from '@nestjs/common';

function shouldNormalizeToStableHttpCode(code: string): boolean {
  if (code === 'INTERNAL_ERROR') return true;
  if (code.includes('EXCEPTION')) return true;
  return false;
}

/** Normaliza códigos verbosos de `HttpException` para códigos estáveis (SDK / suporte). */
export function normalizeHttpErrorCode(status: number, currentCode: string): string {
  if (!shouldNormalizeToStableHttpCode(currentCode)) {
    return currentCode;
  }
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      if (status >= 500) return 'INTERNAL_ERROR';
      return `HTTP_${status}`;
  }
}
