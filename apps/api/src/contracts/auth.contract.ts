/** Contrato REST — autenticação (prefixo global `/api/v1`). */
export const AUTH_ROUTES = {
  login: 'POST /auth/login',
  register: 'POST /auth/register',
  refresh: 'POST /auth/refresh',
  logout: 'POST /auth/logout',
} as const;

export type AuthLoginBody = { email: string; password: string };

export type AuthRefreshBody = { refreshToken: string };

/** Respostas variam conforme `API_RESPONSE_ENVELOPE`; com envelope: `{ data, error }`. */
export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName?: string | null };
};
