#!/usr/bin/env bash
# =============================================================================
# DLZ Backend — Rollback de emergência
# Uso: bash scripts/rollback.sh [MOTIVO]
# Reverte o deploy e aponta tráfego de volta ao Supabase
# =============================================================================

set -euo pipefail

REASON="${1:-Rollback manual}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚨 [$TIMESTAMP] ROLLBACK INICIADO — $REASON"

# ── 1. Para a API atual ───────────────────────────────────────────────────────
echo "🛑 Parando API..."
docker compose -f /opt/dlz-backend/docker-compose.prod.yml stop api

# ── 2. Sobe versão anterior ───────────────────────────────────────────────────
PREV_TAG=$(cat /opt/dlz-backend/.prev_image_tag 2>/dev/null || echo "latest")
echo "⏮️  Voltando para imagem: $PREV_TAG"

export IMAGE_TAG="$PREV_TAG"
docker compose -f /opt/dlz-backend/docker-compose.prod.yml up -d api

# ── 3. Aguarda health check ───────────────────────────────────────────────────
echo "⏳ Aguardando API subir..."
sleep 10
if curl -sf http://localhost:3333/health > /dev/null; then
  echo "✅ API respondendo com versão anterior"
else
  echo "❌ API não respondeu — verifique logs: docker compose logs api"
  exit 1
fi

# ── 4. Desativa feature flags de migração ─────────────────────────────────────
echo "🚩 Desativando feature flags de migração..."
curl -sf -X POST http://localhost:3333/api/v1/migration/canary \
  -H "Content-Type: application/json" \
  -d '{"flag":"new_backend_full","percentage":0}' \
  -H "Authorization: Bearer $ADMIN_TOKEN" || true

echo ""
echo "✅ Rollback concluído: $REASON"
echo "📋 Próximos passos:"
echo "  1. Verificar logs: docker compose -f /opt/dlz-backend/docker-compose.prod.yml logs api"
echo "  2. Reportar incidente no Slack"
echo "  3. Corrigir e fazer novo deploy via GitHub Actions"
