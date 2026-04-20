#!/usr/bin/env bash
# =============================================================================
# DLZ Backend — Setup inicial do servidor Hetzner
# Execute como root na VPS: bash hetzner-setup.sh
# =============================================================================

set -euo pipefail

echo "🚀 Iniciando setup do servidor DLZ..."

# ── Atualizar sistema ─────────────────────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ── Instalar dependências base ────────────────────────────────────────────────
apt-get install -y \
  curl wget git vim htop \
  ufw fail2ban \
  ca-certificates gnupg

# ── Docker ────────────────────────────────────────────────────────────────────
echo "📦 Instalando Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker sem sudo para usuário deploy
usermod -aG docker "${SUDO_USER:-$USER}"

# ── Firewall ──────────────────────────────────────────────────────────────────
echo "🔒 Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Fail2ban ──────────────────────────────────────────────────────────────────
systemctl enable fail2ban
systemctl start fail2ban

# ── Diretório do projeto ──────────────────────────────────────────────────────
mkdir -p /opt/dlz-backend
chown -R "${SUDO_USER:-$USER}":"${SUDO_USER:-$USER}" /opt/dlz-backend

# ── GitHub Container Registry login ──────────────────────────────────────────
echo "🔐 Para completar o setup, rode:"
echo "  docker login ghcr.io -u SEU_GITHUB_USER -p SEU_GITHUB_PAT"
echo ""
echo "📁 Depois, em /opt/dlz-backend:"
echo "  1. Copie o docker-compose.prod.yml"
echo "  2. Crie o .env.production com os secrets"
echo "  3. Execute: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "✅ Setup base concluído!"
echo "⚠️  REINICIE o servidor para aplicar as mudanças de grupo do Docker."
