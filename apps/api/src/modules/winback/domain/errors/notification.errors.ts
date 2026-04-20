export class TransientExternalError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = 'TransientExternalError';
  }
}

export class TerminalExternalError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = 'TerminalExternalError';
  }
}
