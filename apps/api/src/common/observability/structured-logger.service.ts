import { Injectable, Logger } from '@nestjs/common';

/**
 * Logs sempre em uma linha JSON (parseável por ELK/Datadog/Loki).
 * Não usar console.log.
 */
@Injectable()
export class StructuredLoggerService {
  private readonly root = new Logger('Observability');

  log(record: Record<string, unknown>): void {
    this.root.log(JSON.stringify(record));
  }

  warn(record: Record<string, unknown>): void {
    this.root.warn(JSON.stringify(record));
  }

  error(record: Record<string, unknown>): void {
    this.root.error(JSON.stringify(record));
  }
}
