# Zync

Monorepo for a real-time chat app: **React (Vite)** in `client-chat` and **Go (Gin + WebSocket)** in `server-chat`.

## Repository layout

| Folder         | Description                                   |
| -------------- | --------------------------------------------- |
| `client-chat/` | Web & Capacitor (iOS/Android), chat UI, calls |
| `server-chat/` | REST API, WebSocket, PostgreSQL, JWT, Swagger |

Feature lists, stacks, and file structure:

- [client-chat/README.md](client-chat/README.md)
- [server-chat/README.md](server-chat/README.md)

## Prerequisites

- **Node.js** 20+ and npm (workspaces at repo root)
- **Go** 1.25+ and **PostgreSQL** (for the backend)
- Copy env templates from `*.example` in each package (`client-chat`, `server-chat`)

## Local development

**Frontend and backend together (Turbo):**

```bash
npm install
npm run dev
```

**Separate terminals:**

```bash
# Terminal 1 — API (default port 8080; see server-chat/.env.local)
npm run server

# Terminal 2 — Vite (usually http://localhost:5173)
npm run client
```

Set `VITE_API_URL` in `client-chat` so it points at the same base URL as the backend.

## Deploy

### Full stack on VPS (`deploy:vps:all`)

On your machine: builds a **linux/amd64** API binary (avoids OOM compiling Go on small VPS) and runs **Vite prod** for the client. Rsyncs to `/opt/zync` (or a path you pass), uploads `server-chat/.env` and `client-chat/.env.prod`. On the VPS: **Docker Compose** runs Postgres + API (`Dockerfile.prebuilt`) and **nginx** serves `client-chat/dist` on port **4173** (no Node.js required on the server for the web app).

**VPS:** Docker + Compose v2 only.

**Local:** `server-chat/.env.prod` (or `.env`) and `client-chat/.env.prod` with `VITE_API_URL` set to the public API URL.

```bash
npm run deploy:vps:all -- root@YOUR_SERVER_IP
# Custom path and web port:
# WEB_PORT=3000 npm run deploy:vps:all -- root@YOUR_SERVER_IP /opt/zync
```

Shell entry points (all under `scripts/`, **gitignored** — keep copies locally): `deploy-vps-build-all.sh`, `vps-remote-build.sh`, `deploy-server-to-vps.sh`, `deploy-web-to-vps.sh`.

### Backend only (Docker on a VPS)

```bash
npm run deploy:vps -- root@YOUR_SERVER_IP
```

Uses `scripts/deploy-server-to-vps.sh`. Default remote directory is `/opt/server-chat`; the full-stack flow uses one tree (e.g. `/opt/zync`). See `server-chat/README.md` and `server-chat/.env.prod.example`.

### Web frontend (static build + PM2)

1. In `client-chat`: copy `.env.prod.example` to `.env.prod` and set `VITE_API_URL` to your public API (e.g. `http://YOUR_VPS_IP:8080`).
2. On the server **once**: install Node, then `sudo npm install -g pm2 serve` and run `pm2 startup` as PM2 instructs.
3. Deploy the static build with `scripts/deploy-web-to-vps.sh` (local file; not in git):

```bash
# Ensure ALLOWED_ORIGINS in the backend .env on the VPS includes http://YOUR_VPS_IP:4173 (or your chosen port).
npm run deploy:web:vps -- root@YOUR_VPS_IP
# Custom port: WEB_PORT=3000 npm run deploy:web:vps -- root@YOUR_VPS_IP /opt/zync-web
```

The web app is served at `http://YOUR_VPS_IP:4173` by default. Manage the process with `pm2 status`, `pm2 logs zync-web`, or optionally [PM2 Plus](https://pm2.keymetrics.io/).

## License

Private — repository owner unless stated otherwise.
