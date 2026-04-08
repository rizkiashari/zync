# Zync

Monorepo untuk aplikasi chat real-time: **React (Vite)** di `client-chat` dan **Go (Gin + WebSocket)** di `server-chat`.

## Isi repositori

| Folder         | Deskripsi                                      |
| -------------- | ---------------------------------------------- |
| `client-chat/` | Web & Capacitor (iOS/Android), UI chat, panggilan |
| `server-chat/` | REST API, WebSocket, PostgreSQL, JWT, Swagger  |

Detail fitur, stack, dan struktur file ada di:

- [client-chat/README.md](client-chat/README.md)
- [server-chat/README.md](server-chat/README.md)

## Prasyarat

- **Node.js** 20+ dan npm (workspaces di root)
- **Go** 1.25+ dan **PostgreSQL** (untuk backend)
- Salin file env dari `*.example` di masing-masing paket (`client-chat`, `server-chat`)

## Menjalankan lokal

**Frontend + backend sekaligus (Turbo):**

```bash
npm install
npm run dev
```

**Terpisah:**

```bash
# Terminal 1 — API (port default 8080, lihat server-chat/.env.local)
npm run server

# Terminal 2 — Vite (biasanya http://localhost:5173)
npm run client
```

Setel `VITE_API_URL` di `client-chat` agar mengarah ke URL API yang sama dengan backend.

## Deploy

Skrip deploy VPS untuk backend ada di `server-chat/deploy-to-vps.sh`. Lihat `server-chat/README.md` untuk variabel lingkungan produksi.

## Lisensi

Private — milik pemilik repositori kecuali dinyatakan lain.
