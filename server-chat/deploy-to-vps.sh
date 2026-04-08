#!/usr/bin/env bash
# Deploy server-chat + .env to a VPS and run Docker Compose.
# Prereq: SSH login works (e.g. ssh-copy-id), Docker on VPS.
# Buka port API di panel penyedia VPS (security group), tidak cukup hanya ufw.
#
# Usage:
#   SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office ./deploy-to-vps.sh root@103.178.153.192
# Optional second arg: remote directory (default /opt/server-chat)
#
# Modes:
# - Default: build on VPS (REMOTE_BUILD=1)
# - Local build + upload image: REMOTE_BUILD=0
#   REMOTE_BUILD=0 SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office ./deploy-to-vps.sh root@HOST
# - Skip build and only recreate containers:
#   DEPLOY_NO_BUILD=1 ./deploy-to-vps.sh root@HOST
set -euo pipefail

REMOTE="${1:?Usage: $0 user@host [remote_dir]}"
RDIR="${2:-/opt/server-chat}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC2034
SSH_OPTS=()
RSYNC_E=(ssh)
if [[ -n "${SSH_IDENTITY_FILE:-}" ]]; then
  EXPANDED="${SSH_IDENTITY_FILE/#\~/$HOME}"
  SSH_OPTS=( -i "$EXPANDED" )
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
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '$RDIR'"
rsync -avz -e "${RSYNC_E[*]}" \
  --exclude '.git' \
  --exclude 'pgdata' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.prod' \
  "$SCRIPT_DIR/" "$REMOTE:$RDIR/"

echo ">>> Uploading .env..."
scp "${SSH_OPTS[@]}" "$ENV_SRC" "$REMOTE:$RDIR/.env"

if [[ "${REMOTE_BUILD:-1}" == "0" ]]; then
  echo ">>> Building API image locally..."
  (
    cd "$SCRIPT_DIR"
    docker compose --env-file "$ENV_SRC" build api
  )

  TMP_IMAGE="/tmp/server-chat-api.tgz"
  echo ">>> Saving and uploading image to VPS..."
  docker save server-chat-api:latest | gzip > "$TMP_IMAGE"
  scp "${SSH_OPTS[@]}" "$TMP_IMAGE" "$REMOTE:/tmp/server-chat-api.tgz"

  echo ">>> Loading image on VPS..."
  ssh "${SSH_OPTS[@]}" "$REMOTE" "gunzip -c /tmp/server-chat-api.tgz | docker load && rm -f /tmp/server-chat-api.tgz"
fi

echo ">>> Starting containers..."
if [[ "${DEPLOY_NO_BUILD:-}" == "1" ]]; then
  ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$RDIR' && docker compose up -d --no-build"
else
  if [[ "${REMOTE_BUILD:-1}" == "0" ]]; then
    ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$RDIR' && docker compose up -d --no-build --force-recreate api"
  else
    ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$RDIR' && docker compose up -d --build" || {
      echo "!!! compose --build failed. Try local build mode:" >&2
      echo "    REMOTE_BUILD=0 SSH_IDENTITY_FILE=~/.ssh/id_ed25519_office $0 $REMOTE $RDIR" >&2
      exit 1
    }
  fi
fi

echo ">>> Status:"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$RDIR' && docker compose ps"

HOST_ONLY="${REMOTE#*@}"
echo ""
echo "Done. Try: curl -sS http://${HOST_ONLY}:8080/health"
echo "(Use the port from API_PUBLISH_PORT in .env if not 8080.)"
