# Padrão oficial de módulos — DLZ API (NestJS)

Este documento é a referência para novos módulos e para refatoração incremental dos existentes.

## 1. Estrutura de pastas (`apps/api/src/modules/<nome>/`)

```
<nome>/
  <nome>.module.ts
  presentation/
    controllers/
    dtos/
  application/
    commands/           # tipos de entrada dos use cases (sem class-validator)
    use-cases/
  domain/
    entities/
    value-objects/
    policies/
    events/
    ports/
  infrastructure/
    persistence/
    gateways/         # opcional: Stripe, Mercado Pago, etc.
    events/
    integrations/     # opcional: clients HTTP externos
```

### Camadas — responsabilidades

| Camada | Responsabilidade | Pode | Não pode |
|--------|------------------|------|----------|
| **presentation** | HTTP: rotas, DTOs de entrada/saída, Swagger, guards por rota | Validar formato (class-validator), mapear DTO → comando, chamar use case | Prisma, Stripe, regra de negócio complexa |
| **application** | Orquestração: um ficheiro = um caso de uso; transações; portas; **commands** (tipos puros de entrada) | Depender de `domain` e `ports` (interfaces); usar `@Injectable()` | Importar `PrismaService` ou DTOs de `presentation` |
| **domain** | Regras puras, invariantes, tipos, eventos de domínio | TypeScript sem Nest; funções puras | `PrismaClient`, `ConfigService`, HTTP |
| **infrastructure** | Implementações das portas (Prisma, filas, EventEmitter) | Depender de pacotes externos | Ser importada por `domain` |

### Fluxo de dependências (obrigatório)

```
presentation  →  application  →  domain
       ↓                ↓
infrastructure (implementa ports definidos em domain/ports)
```

- **domain** não importa nada de `application`, `infrastructure` ou `presentation`.
- **application** importa `domain` e `ports` (interfaces em `domain/ports`).
- **infrastructure** importa `domain` (ports + tipos) e `@dlz/prisma`, etc.
- **presentation** importa `application` e DTOs locais.

## 2. Convenções de ficheiros

- Use cases: `verb-noun.use-case.ts` (ex.: `create-order.use-case.ts`).
- Portas: `<context>.repository.port.ts`, `<context>.event.publisher.port.ts`.
- Repositório Prisma: `prisma-<context>.repository.ts`.
- Controllers: `<context>.controller.ts` ou `<context>-public.controller.ts` se separar público/painel.
- DTOs: `create-<resource>.dto.ts` em `presentation/dtos/`.

## 3. API — resposta padrão

- **Meta-alvo (novos endpoints):** `{ data: T, meta: Record<string, unknown>, error: null }` em sucesso; em erro, `error` preenchido (ou exceções Nest mantidas nas rotas legadas).
- **Sucesso lista paginada:** `{ data: T[], meta: { total, page, limit, totalPages } }` (já usado em pedidos).
- **Sucesso recurso (legado):** muitas rotas ainda devolvem o corpo “cru” (`{ url }`, `{ orderCode, id, total }`, …) para não quebrar o frontend — **não alterar** até haver interceptor global ou migração coordenada.
- **Erro:** manter `GlobalExceptionFilter` (quando registado) ou exceções Nest (`BadRequestException`, `NotFoundException`). Para regras de domínio transversais, usar `AppDomainException` + `AppDomainExceptionFilter` (ver `common/errors`).

## 4. Multi-tenant

- Toda leitura/escrita tenant-scoped passa pelo repositório com **`tenantId` explícito** no método (nunca inferir só do body sem validação).
- Rotas de painel: `tenantId` vem do JWT (`TenantId()`); use case recebe `tenantId` já autenticado.
- Rotas públicas: `tenantId` vem do body/query com regras de domínio (ex.: loja existe e está aberta).
- **Proibido** em repositórios de módulo tenant-scoped: `findMany` sem `where.tenantId` para dados da loja.

## 5. Migração gradual

1. Novo código no padrão acima.
2. Módulo antigo exporta o mesmo contrato HTTP até o frontend migrar.
3. **RPCs (`modules/rpcs`):** sem regra de negócio; mapear DTO → **command** e chamar o use case do módulo dono do agregado (`OrdersModule`, `PaymentsModule`, …). Marcar endpoints legados com `@ApiOperation({ deprecated: true, … })` quando existir alternativa REST.

## 5.1 Transações (`Prisma.$transaction`)

- Preferir uma **porta** de transação no módulo (ex.: `OrderTransactionRunnerPort`) com implementação `PrismaOrderTransactionRunner` que instancia o **mesmo** repositório Prisma mas com o `tx` injetado, para não vazar `PrismaService` nos use cases.
- Use case orquestra: chama `orderTx.run((orders) => …)` quando precisa de atomicidade (ex.: consumir cupom + criar pedido).

## 6. Referência implementada: `modules/orders`

O módulo `orders` foi refatorado como **template oficial**:

- `presentation/controllers/orders.controller.ts` — HTTP + `HttpLoggingInterceptor` + `RequireTenantGuard` nas rotas de painel.
- `application/use-cases/*` — orquestração; `CreateOrderUseCase` recebe `CreateOrderCommand`.
- `domain/ports/*` — `OrdersRepositoryPort`, `OrderEventPublisherPort`.
- `infrastructure/persistence/prisma-orders.repository.ts` — todas as queries com `tenantId` explícito em operações de loja.
- `infrastructure/events/nest-order-event.publisher.ts` — mapeia `OrderCreatedDomainEvent` → `EventEmitter2` (`order.created` / `order.status_changed`).

### Convivência com código antigo (sem breaking change)

- **URLs e verbos HTTP mantidos** (`POST /orders`, `GET /orders`, …).
- **Corpo de resposta** igual ao anterior (ex.: criar pedido devolve `{ orderCode, id, total }`).
- Outros módulos podem importar `CreateOrderUseCase` ou `OrdersRepositoryPort` a partir de `OrdersModule.exports` para substituir chamadas duplicadas (ex.: futuro `RpcsModule` a delegar no mesmo use case).
- **Paralelismo:** não é necessário duplicar rotas; o refactor é **in-place** no mesmo módulo.

### Extras transversais (`apps/api/src/common/`)

- `errors/app-domain.exception.ts` — erros de domínio com `code` + HTTP status.
- `filters/app-domain-exception.filter.ts` — mapeamento JSON estável (registado em `main.ts` após `GlobalExceptionFilter`).
- `interceptors/http-logging.interceptor.ts` — logging com `tenantId` / `userId` quando existem.
- `guards/require-tenant.guard.ts` — exige `tenantId` no JWT para rotas de painel.

### Regra API — resposta de lista

`ListOrdersUseCase` mantém `{ data, meta: { total, page, limit, totalPages } }`.

### Referência implementada: `modules/payments`

- `presentation/controllers/payments.controller.ts` — mantém paths legados (`stripe/checkout`, `mercadopago/webhook`, …); rota nova `GET payments/billing/summary` com envelope `{ data, meta, error }`.
- `application/use-cases/*` — checkout Stripe, portal, preferência MP, webhooks (Stripe / Cakto / MP), resumo de subscrição.
- `application/services/stripe-tenant-plan-sync.application-service.ts` — orquestra atualização de plano após eventos Stripe (persistência + evento).
- `domain/ports/*` — `SubscriptionRepositoryPort`, `PaymentsRepositoryPort`, `StripeBillingGatewayPort`, `MercadoPagoGatewayPort`, `BillingEventPublisherPort`.
- `infrastructure/persistence/*` — repositórios Prisma tenant-aware onde aplicável.
- `infrastructure/gateways/*` — Stripe e Mercado Pago.
- **Webhooks:** resolver `tenantId` / `orderId` a partir de metadata referenciada na base e validar coerência antes de atualizar.

### Domínio rico (pedidos)

- `OrderEntity`: métodos como `calculateTotal`, `canBeCancelled`, `changeStatus` — a UI e fluxos legados podem continuar a usar caminhos que não invocam todos os métodos; use cases devem preferir invariantes de domínio quando não houver risco de regressão.

### Eventos com payload tipado

- Evitar `JSON.stringify` de entidades inteiras no publisher: usar **mapper** (ex.: `toOrderRealtimePayload`) + classe de evento de domínio com payload explícito.
