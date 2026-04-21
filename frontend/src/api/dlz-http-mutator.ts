import axios, { type AxiosRequestConfig } from 'axios';

/** Origem da API (paths do OpenAPI já incluem `/api/v1/...`). Ajuste no app (ex.: Vite) conforme o ambiente. */
const baseURL = 'http://127.0.0.1:3333';

/** Client HTTP compartilhado pelo código gerado pelo Orval em `src/api/generated/`. */
export function dlzApiInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return axios.request<T>({ ...config, baseURL: config.baseURL ?? baseURL }).then((r) => r.data);
}

export default dlzApiInstance;
