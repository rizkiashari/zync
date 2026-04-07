#!/usr/bin/env bash
# Deploy server-chat + .env to a VPS and run Docker Compose.
# Prereq: SSH login works (e.g. ssh-copy-id), Docker on VPS.
# Buka port API di panel penyedia VPS (security group), tidak cukup hanya ufw.
#
# Usage:
#   SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office ./deploy-to-vps.sh root@103.178.153.192
# Optional second arg: remote directory (default /opt/server-chat)
#
# If build on VPS fails, set DEPLOY_NO_BUILD=1 (after docker load image on server).
#   DEPLOY_NO_BUILD=1 SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office ./deploy-to-vps.sh root@HOST
#
# If VPS cannot pull from Docker Hub (DNS timeout), build on Mac then load on server:
#   docker compose build api
#   docker save server-chat-api:latest | gzip > api.gz
#   scp api.gz REMOTE:/tmp/ && ssh REMOTE 'gunzip -c /tmp/api.gz | docker load && rm /tmp/api.gz'
#   ssh REMOTE "cd $RDIR && docker compose up -d --no-build --force-recreate api"
set -euo pipefail

REMOTE="${1:?Usage: $0 user@host [remote_dir]}"
RDIR="${2:-/opt/server-chat}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_ID=()
RSYNC_E=(ssh)
if [[ -n "${SSH_IDENTITY_FILE:-}" ]]; then
  EXPANDED="${SSH_IDENTITY_FILE/#\~/$HOME}"
  SSH_ID=( -i "$EXPANDED" )
  RSYNC_E=( ssh -i "$EXPANDED" )
fi

ENV_SRC="$SCRIPT_DIR/.env.prod"
if [[ ! -f "$ENV_SRC" ]]; then
  ENV_SRC="$SCRIPT_DIR/.env"
fi
if [[ ! -f "$ENV_SRC" ]]; then
  echo "Missing .env.prod (or legacy .env). cp .env.prod.example .env.prod" >&2
  exit 1
fi

echo ">>> Syncing files to $REMOTE:$RDIR (excluding .git, .env on first pass)..."
ssh "${SSH_ID[@]}" "$REMOTE" "mkdir -p '$RDIR'"
rsync -avz -e "${RSYNC_E[*]}" \
  --exclude '.git' \
  --exclude 'pgdata' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.prod' \
  "$SCRIPT_DIR/" "$REMOTE:$RDIR/"

echo ">>> Uploading .env..."
scp "${SSH_ID[@]}" "$ENV_SRC" "$REMOTE:$RDIR/.env"

echo ">>> Starting containers..."
if [[ "${DEPLOY_NO_BUILD:-}" == "1" ]]; then
  ssh "${SSH_ID[@]}" "$REMOTE" "cd '$RDIR' && docker compose up -d --no-build"
else
  ssh "${SSH_ID[@]}" "$REMOTE" "cd '$RDIR' && docker compose up -d --build" || {
    echo "!!! compose --build failed (registry/DNS?). On Mac: docker compose build api && docker save server-chat-api:latest | gzip > /tmp/api.tgz" >&2
    echo "    scp /tmp/api.tgz $REMOTE:/tmp/ && ssh $REMOTE 'gunzip -c /tmp/api.tgz | docker load && rm /tmp/api.tgz'" >&2
    echo "    DEPLOY_NO_BUILD=1 SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office $0 $REMOTE $RDIR" >&2
    exit 1
  }
fi

echo ">>> Status:"
ssh "${SSH_ID[@]}" "$REMOTE" "cd '$RDIR' && docker compose ps"

HOST_ONLY="${REMOTE#*@}"
echo ""
echo "Done. Try: curl -sS http://${HOST_ONLY}:8080/health"
echo "(Use the port from API_PUBLISH_PORT in .env if not 8080.)"
