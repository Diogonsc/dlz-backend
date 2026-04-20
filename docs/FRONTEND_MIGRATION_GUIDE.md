# DLZ Frontend — Guia de Migração Supabase → Backend NestJS

Este documento mapeia cada chamada do frontend (Edge Functions, RPCs, tabelas diretas)
para o endpoint equivalente no backend NestJS.

---

## 1. Edge Functions → Endpoints REST

| Edge Function | Método | Endpoint NestJS | Notas |
|---|---|---|---|
| `create-store-signup` | POST | `/api/v1/signup/store` | Retorna `checkoutUrl` Cakto |
| `create-store-admin` | POST | `/api/v1/rpc/create-store-admin` | Admin only |
| `create-checkout` | POST | `/api/v1/payments/stripe/checkout` | Body: `{ priceId }` |
| `resume-tenant-checkout` | POST | `/api/v1/payment-gateways/resume-checkout` | JWT obrigatório |
| `customer-portal` | POST | `/api/v1/payments/stripe/portal` | Retorna `{ url }` |
| `check-subscription` | GET | `/api/v1/payment-gateways/stripe/subscription` | Retorna `{ subscribed, priceId }` |
| `manage-domain` | POST | `/api/v1/domains/manage` | Body: `{ action, domain }` |
| `send-otp` | POST | `/api/v1/otp/send` | Body: `{ phone }` — retorna `{ code }` |
| `mercadopago-create-preference` | POST | `/api/v1/payments/mercadopago/preference` | JWT obrigatório |
| `ifood-auth` (URL OAuth) | GET | `/api/v1/ifood/auth` | JWT — retorno `{ url }` |
| `ifood-auth` (refresh token) | POST | `/api/v1/ifood/auth/refresh` | JWT — preferido |
| `ifood-auth` (testar token) | POST | `/api/v1/ifood/auth/test` | JWT — preferido |
| `ifood-auth` (legado) | POST | `/api/v1/ifood/auth-action` | Body `{ "action": "refresh" \| "test" }` |
| `ifood-order-sync` | POST | `/api/v1/ifood/sync-order` | JWT — body: `{ "order_id", "new_status", "store_id"?: }` |
| `winback-scheduler` | POST | `/api/v1/winback/send` | Disparo manual (fila interna continua em `JobsModule`) |
| `reoptimize-storage-image` | — | **Não implementado** | Não existe rota; tratar no frontend ou nova issue |
| `pwa-manifest` | GET | `/api/v1/pwa/manifest?store_id=` | Retorna webmanifest |
| `send-tenant-push` | POST | `/api/v1/push/send` | Body: `{ title, body, url }` |

---

## 2. RPCs Supabase → Endpoints REST

| RPC | Método | Endpoint NestJS |
|---|---|---|
| `resolve_store_slug(slug)` | GET | `/api/v1/rpc/resolve-store?slug=X` |
| `resolve_store_by_host(host)` | GET | `/api/v1/rpc/resolve-store?host=X` |
| `get_public_store_config(store_id)` | GET | `/api/v1/rpc/store-config?store_id=X` (**`store_id` obrigatório**) |
| `get_store_pix_config(store_id)` | GET | `/api/v1/rpc/pix-config?store_id=X` (**`store_id` obrigatório**) |
| `get_tenant_plan_limits(tenant_id)` | GET | `/api/v1/rpc/plan-limits` (JWT) |
| `can_create_resource(tenant_id, resource)` | GET | `/api/v1/rpc/can-create/:resource` (JWT) |
| `get_customer_profile(phone)` | GET | `/api/v1/rpc/customer-profile?phone=X` |
| `upsert_customer_profile(...)` | POST | `/api/v1/rpc/customer-profile?store_id=X` |
| `validate_otp(phone, code)` | POST | `/api/v1/otp/verify` |
| `track_order(order_code)` | GET | `/api/v1/orders/track/:code` |
| `confirm_delivery_received(order_code)` | POST | `/api/v1/rpc/confirm-delivery/:code` |
| `resolve_table_token(token)` | GET | `/api/v1/rpc/table-token/:token` |
| `get_or_create_open_tab(store_id, table_id)` | POST | `/api/v1/rpc/open-tab` (JWT) |
| `finalize_table_order_payment(order_code)` | POST | `/api/v1/rpc/finalize-table-payment/:code` |
| `get_inactive_customers(store_id)` | GET | `/api/v1/rpc/inactive-customers` (JWT) |
| `get_ifood_credentials_safe(store_id)` | GET | `/api/v1/rpc/ifood-credentials` (JWT) |
| `upsert_ifood_credentials(...)` | POST | `/api/v1/rpc/ifood-credentials` (JWT) |
| `get_mercadopago_gateway_admin(tenant_id)` | GET | `/api/v1/rpc/mp-gateway` (JWT) |
| `upsert_mercadopago_gateway_admin(...)` | POST | `/api/v1/rpc/mp-gateway` (JWT) |
| `get_mercadopago_checkout_available(store_id)` | GET | `/api/v1/payment-gateways/mp/availability` |

---

## 3. Realtime Supabase → Socket.io NestJS

O frontend usa `supabase.channel(...).on('postgres_changes', ...)`. No backend NestJS
existe um gateway Socket.io em `wss://api.dlz.app.br/realtime`.

### Eventos emitidos pelo servidor:

| Evento | Descrição |
|---|---|
| `order:new` | Novo pedido criado (broadcast para room `tenant:<id>`) |
| `order:updated` | Status do pedido atualizado |

### Como conectar no frontend:

```typescript
// Antes (Supabase)
const channel = supabase.channel('admin-order-notifications')
  .on('postgres_changes', { event: 'INSERT', table: 'orders' }, handler)
  .subscribe()

// Depois (Socket.io)
import { io } from 'socket.io-client'

const socket = io('wss://api.dlz.app.br/realtime', {
  auth: { token: accessToken }
})

socket.on('order:new', (order) => handler({ new: order }))
socket.on('order:updated', (order) => handler({ new: order }))

// Para vitrine pública (sem JWT):
socket.emit('join:store', tenantId)
socket.on('order:updated', handler)
```

### Tabs realtime (`tabs:updated`)

O servidor emite o evento Socket.io **`tabs:updated`** (namespace `/realtime`) com payload estável:

```json
{
  "type": "tabs.updated",
  "storeId": "<uuid do tenant>",
  "tabId": "<uuid da comanda>",
  "status": "open|closed"
}
```

No frontend, invalide cache quando `payload.storeId` for a loja atual (não dependa de `payload.new`).

---

## 4. Envelope de resposta (opcional)

Defina `API_RESPONSE_ENVELOPE=true` para receber sempre:

- Sucesso: `{ "data": <corpo>, "error": null }`
- Erro: `{ "data": null, "error": { "message": "...", "code": "..." } }`

Sem essa variável, a API mantém o formato legado (`statusCode`, `message`, `correlationId`, etc.).

---

## 5. Auth Supabase → JWT NestJS

| Operação | Antes | Depois |
|---|---|---|
| Login | `supabase.auth.signInWithPassword` | `POST /api/v1/auth/login` |
| Cadastro | `create-store-signup` Edge Function | `POST /api/v1/signup/store` |
| Obter user | `supabase.auth.getUser()` | `GET /api/v1/users/me` (Bearer) |
| Logout | `supabase.auth.signOut()` | `POST /api/v1/auth/logout` |
| Reset senha | `supabase.auth.resetPasswordForEmail` | Pendente — implementar EmailModule |
| Atualizar senha | `supabase.auth.updateUser` | `PATCH /api/v1/users/me/profile` |
| OTP telefone | `send-otp` + `validate_otp` | `POST /api/v1/otp/send` + `/api/v1/otp/verify` |

---

## 6. Storage Supabase → S3/R2 NestJS

| Operação | Antes | Depois |
|---|---|---|
| Upload imagem | `supabase.storage.from('bucket').upload(...)` | `POST /api/v1/storage/upload/:folder` (multipart Fastify; primeiro arquivo do form) |
| URL pública | `supabase.storage.from('bucket').getPublicUrl(...)` | URL direta do R2/S3 retornada no upload |
| Remover objeto | — | `DELETE /api/v1/storage/file?key=<key>` (URL-encode se necessário) |
| Reotimizar | Edge Function | **Não implementado** nesta API |

---

## 7. Estratégia de migração gradual

A Fase 6 implementa feature flags por tenant. O frontend pode verificar:

```typescript
const { data } = await fetch('/api/v1/migration/flags/' + tenantId)
const useNewBackend = data.flags.includes('new_backend_full')

// Usa Supabase ou NestJS conforme a flag
const orders = useNewBackend
  ? await nestApi.get('/orders')
  : await supabase.from('orders').select('*')
```

Assim a migração pode ser feita por tenant, módulo a módulo, sem downtime.

---

## 8. PDV — Endpoints adicionados (análise final v3)

### Mesas (`restaurant_tables`)

| Operação Frontend | Endpoint NestJS |
|---|---|
| `from("restaurant_tables").select("*")` | `GET /api/v1/tables` |
| `from("restaurant_tables").insert({...})` | `POST /api/v1/tables` |
| `from("restaurant_tables").update(data).eq("id", id)` | `PATCH /api/v1/tables/:id` |
| `from("restaurant_tables").delete().eq("id", id)` | `DELETE /api/v1/tables/:id` |

### Comandas (`tabs`)

| Operação Frontend | Endpoint NestJS |
|---|---|
| `from("tabs").select("*, restaurant_tables(number)")` | `GET /api/v1/tabs` |
| `from("tabs").update({ status:"closed", tip, ... })` | `PATCH /api/v1/tabs/:id/close` |
| `from("orders").update({status:"delivered"}).eq("table_id")` | Incluído no PATCH /tabs/:id/close |

### Caixa PDV (`cash_registers` + `cash_movements`)

| Operação Frontend | Endpoint NestJS |
|---|---|
| `from("cash_registers").select("*")` | `GET /api/v1/cash/registers` |
| `from("cash_registers").insert({ opened_by: user.id, opening_balance })` | `POST /api/v1/cash/registers/open` |
| `from("cash_registers").update({ status:"closed", closing_balance })` | `PATCH /api/v1/cash/registers/:id/close` |
| `from("cash_movements").select("*").eq("register_id")` | `GET /api/v1/cash/registers/:id/movements` |
| `from("cash_movements").insert({...})` | `POST /api/v1/cash/movements` |

### Winback logs (`winback_logs`)

| Operação Frontend | Endpoint NestJS |
|---|---|
| `from("winback_logs").select("*").limit(100)` | `GET /api/v1/winback/logs` |
| `from("winback_logs").select("id", {count:"exact"}).gte("sent_at")` | `GET /api/v1/winback/logs/monthly-count` |
| `invoke("winback-scheduler", { customer_phones })` | `POST /api/v1/winback/send` |

### iFood sync manual

| Operação Frontend | Endpoint NestJS |
|---|---|
| `invoke("ifood-order-sync", { order_id, new_status })` | `POST /api/v1/ifood/sync-order` |

### Realtime Tabs

O hook `useTabs.ts` usa `supabase.channel('tabs-realtime-${storeId}').on('postgres_changes', { table: 'tabs' })`.

No backend, o `RealtimeGateway` emite `tabs:updated` quando tabs mudam.
Troca no frontend:

```typescript
// Antes
supabase.channel(`tabs-realtime-${storeId}`)
  .on('postgres_changes', { table: 'tabs' }, () => qc.invalidateQueries(key))
  .subscribe()

// Depois
socket.on('tabs:updated', (payload) => {
  if (payload.storeId === storeId) qc.invalidateQueries(key)
})
```

---

## 9. Contratos TypeScript (referência)

Arquivos em `apps/api/src/contracts/` descrevem rotas e tipos de alto nível (`auth`, `tabs`, `ifood`) para alinhar frontend e backend.

---

## 10. Schemas corrigidos (v3)

- **`CashMovement`** — adicionados `store_id`, `payment_method`, `order_id`, `created_by`
- **`WinbackLog`** — adicionados `customer_name`, `coupon_id`, `channel`, `campaign`, `segment` (alinhado ao schema real)
- **`OrderPayment`** — corrigido para schema real: `store_id`, `tip`, sem `status/gatewayRef/gatewayData`
- **`WinbackLog.couponId`** — FK para `winback_coupons` é opcional (campo `coupon_id` no banco)

