# DLZ Backend — Análise de Gaps vs. Aplicação Real

Gerado após análise completa do repositório menu-magic:
- 25 Edge Functions
- 20+ migrations
- 4 features (delivery-store, store-admin, saas-dashboard, store-signup)

---

## ❌ GAPS CRÍTICOS — Funcionalidades ausentes no backend gerado

### 1. Signup de Loja (`create-store-signup`)
**O que faz:** Cria usuário + role admin + tenant com status `pending_payment` + store_config + retorna URL do Cakto checkout.
**O que está no backend:** TenantsModule não tem este fluxo (sem status `pending_payment`, sem subdomain, sem `plan_id`).
**Módulo necessário:** `SignupModule` com endpoint `POST /signup/store`.

### 2. OTP por Telefone (`send-otp`)
**O que faz:** Gera código OTP de 6 dígitos via RPC `create_otp`, retorna o código para exibição na vitrine.
**Usado em:** `PhoneAuthFlow.tsx` — autenticação do cliente na vitrine.
**Módulo necessário:** `OtpModule` com `POST /otp/send` e `POST /otp/verify`.

### 3. Domínio Customizado via Vercel (`manage-domain`)
**O que faz:** Integra com Vercel API para add/remove/verify domínios customizados por tenant. Atualiza `domain_status` no tenant.
**Campos ausentes no schema Prisma:** `subdomain`, `domain_status`, `custom_domain`, `trial_ends_at`, `pending_payment` status.
**Módulo necessário:** `DomainsModule` com Vercel API.

### 4. Resume Tenant Checkout (`resume-tenant-checkout`)
**O que faz:** Usuário com `pending_payment` pode retomar o checkout Cakto.
**Módulo necessário:** endpoint `POST /payments/resume-checkout`.

### 5. Check Subscription Stripe (`check-subscription`)
**O que faz:** Verifica se usuário autenticado tem assinatura Stripe ativa. Retorna `subscribed`, `product_id`, `price_id`.
**Módulo necessário:** endpoint `GET /payments/stripe/subscription`.

### 6. PWA Manifest Dinâmico (`pwa-manifest`)
**O que faz:** Gera `manifest.webmanifest` por tenant com nome, ícone e cor da loja.
**Módulo necessário:** `PwaModule` com `GET /pwa/manifest?store_id=`.

### 7. Reotimização de Imagens (`reoptimize-storage-image`)
**O que faz:** Lê imagem do Storage, redimensiona (max 1200px), converte para WebP, salva versão versionada.
**Módulo necessário:** endpoint `POST /storage/reoptimize` no StorageModule.

### 8. Twilio WhatsApp (`twilio-webhook`, `twilio-status-webhook`)
**O que faz:** Recebe mensagens inbound Twilio, processa opt-out/opt-in, reencaminha cupons.
**Falta no backend:** WhatsAppModule só tem Meta Cloud API. Faltam Twilio + tabelas `whatsapp_contacts`, `whatsapp_messages`, `whatsapp_outbound_queue`, `whatsapp_logs`.

### 9. TenantAccessGate — `pending_payment` e `trial_expired`
**O que faz:** Frontend bloqueia acesso ao painel se status for `pending_payment` ou trial expirado.
**O que falta:** Status `pending_payment` não existe no enum Prisma. Campo `trial_ends_at` ausente no schema.

### 10. Payment Gateways por Tenant (`payment_gateways`)
**O que faz:** Cada tenant tem credenciais MercadoPago próprias (public_key, access_token, environment).
**Tabela completamente ausente** no schema Prisma gerado.

---

## ⚠️ GAPS SECUNDÁRIOS — Campos ausentes no schema Prisma

### Tenants (campos missing):
- `subdomain` TEXT UNIQUE
- `domain_status` TEXT DEFAULT 'none'
- `trial_ends_at` TIMESTAMPTZ
- `plan_id` UUID → FK plans
- Status `pending_payment` no enum

### StoreConfig (campos missing):
- `primary_color` TEXT
- `accent_color` TEXT
- `whatsapp_message_template` TEXT
- `whatsapp_auto_send` BOOLEAN
- `delivery_dynamic_enabled` BOOLEAN
- `delivery_regions` JSONB
- `delivery_origin_lat` DOUBLE
- `delivery_origin_lng` DOUBLE

### Orders (campos missing):
- `online_payment_status` ENUM
- `mp_preference_id` TEXT
- `mp_payment_id` TEXT
- `mp_payment_status_detail` TEXT
- `marketing_whatsapp_opt_in` BOOLEAN
- `tip` NUMERIC
- `table_number` INT
- `ifood_order_id` TEXT
- `ifood_order_type` TEXT
- `ifood_api_flags` JSONB
- Status `cancelled` no enum

### Products (campos missing):
- `images` JSONB (galeria de imagens)

### Plans (campos missing — direto na tabela, não em plan_limits):
- `max_products` INT
- `max_categories` INT
- `max_coupons` INT

---

## 🆕 TABELAS COMPLETAMENTE AUSENTES no schema Prisma

| Tabela | Propósito |
|--------|-----------|
| `payment_gateways` | Credenciais MP por tenant |
| `whatsapp_contacts` | Contatos + opt-in/out por loja |
| `whatsapp_messages` | Histórico de mensagens in/out |
| `whatsapp_outbound_queue` | Fila de envio com retry |
| `whatsapp_delivery_status` | Status de entrega Twilio |
| `whatsapp_inbound_logs` | Logs de mensagens recebidas |
| `whatsapp_logs` | Log completo WhatsApp |
| `ifood_logs` | Logs de webhook iFood |
| `coupon_validate_rate` | Rate limit de validação de cupom |

---

## 🔧 MÓDULOS NESTJS A CRIAR/COMPLETAR

1. **SignupModule** — fluxo completo de cadastro público de loja
2. **OtpModule** — geração e verificação de OTP por telefone
3. **DomainsModule** — integração Vercel API para domínios customizados
4. **PwaModule** — manifest dinâmico por tenant
5. **PaymentsModule** — adicionar: resume-checkout, check-subscription
6. **WhatsAppModule** — adicionar: Twilio provider, tabelas de contatos/fila/logs
7. **StorageModule** — adicionar: reoptimize-image endpoint

