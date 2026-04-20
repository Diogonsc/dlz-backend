# Swagger (OpenAPI) - API

Este projeto usa `@nestjs/swagger` para documentar os endpoints da API.

## Onde acessar

- UI interativa: `http://localhost:3333/docs`
- OpenAPI JSON: `http://localhost:3333/docs/json`

> Se a API estiver em outra porta/host, ajuste a URL conforme o ambiente.

## Como subir o projeto

Na raiz do monorepo:

```bash
pnpm dev
```

Depois, abra a documentação no navegador.

## Variaveis de ambiente do Swagger

- `SWAGGER_ENABLED`: habilita/desabilita o Swagger explicitamente (`true`/`false`).
  - Por padrao, em `development` fica habilitado.
- `SWAGGER_PATH`: caminho da documentacao (padrao: `docs`).
- `SWAGGER_SERVER_URL`: URL base exibida no Swagger como servidor.

Exemplo:

```env
SWAGGER_ENABLED=true
SWAGGER_PATH=docs
SWAGGER_SERVER_URL=https://api.seudominio.com
```

## Autenticacao Bearer na UI

Endpoints protegidos usam JWT. Para testar no Swagger:

1. Faça login em um endpoint de autenticacao (ex: `POST /api/v1/auth/login`).
2. Copie o `accessToken` retornado.
3. Clique em **Authorize** na UI do Swagger.
4. Informe o token no formato `Bearer <token>`.

## Boas praticas para manter a documentacao

- Use `@ApiTags()` nos controllers para organizar os grupos.
- Use `@ApiOperation()` para descrever o objetivo de cada endpoint.
- Use DTOs com `class-validator` para refletir schemas de request/response.
