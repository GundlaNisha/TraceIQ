#!/usr/bin/env bash
# ==============================================================================
# TraceIQ — AWS EC2 / Lightsail / Ubuntu Cloud-Init User Data Script
# ==============================================================================
set -euo pipefail

echo "==> [TraceIQ] Initializing Host Server Setup..."

# 1. Update and install base utilities
apt-get update -y
apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop

# 2. Install official Docker Engine & Docker Compose Plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
systemctl enable docker
systemctl start docker

# 3. Configure UFW Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# 4. Clone or pull TraceIQ repository
APP_DIR="/opt/traceiq"
if [ ! -d "$APP_DIR" ]; then
    echo "==> [TraceIQ] Cloning TraceIQ repository to $APP_DIR..."
    git clone https://github.com/GundlaNisha/TraceIQ.git "$APP_DIR"
else
    echo "==> [TraceIQ] Updating existing repository in $APP_DIR..."
    cd "$APP_DIR" && git pull origin main
fi

cd "$APP_DIR"

# 5. Create required directories
mkdir -p data/certbot/conf data/certbot/www data/snapshots

# 6. Install systemd service for automatic container management
cp deploy/systemd/traceiq.service /etc/systemd/system/traceiq.service
systemctl daemon-reload
systemctl enable traceiq.service

echo "=============================================================================="
echo "==> [TraceIQ] Setup Complete!"
echo "==> Edit /opt/traceiq/backend/.env.production with your credentials."
echo "==> Then run: systemctl start traceiq"
echo "==> For SSL: /opt/traceiq/scripts/init-letsencrypt.sh"
echo "=============================================================================="
