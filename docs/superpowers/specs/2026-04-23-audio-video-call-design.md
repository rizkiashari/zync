# Audio/Video Call — Design Spec

**Date:** 2026-04-23
**Status:** Approved

---

## Overview

Tambah fitur Audio/Video Call ke Zync yang mendukung call 1-on-1 maupun group call. Menggunakan Livekit (self-hosted di VPS) untuk media transport, dan WebSocket Zync yang sudah ada untuk signaling (ringing, accept, reject, end). UI mendukung mode full-screen dan floating mini window (picture-in-picture).

---

## Scope

- Call 1-on-1 dan group (multi-participant)
- Audio call dan video call
- Screen sharing
- In-call chat
- Raise hand
- Participant list
- Riwayat call
- Livekit self-hosted di VPS `103.178.153.192`

---

## Arsitektur

### Komponen Utama

```js
Client (React)
    │
    ├── WebSocket Zync ──► Go Backend
    │     (signaling: ring, accept, reject, end)
    │
    └── Livekit SDK ──────► Livekit Server (VPS)
          (media: audio, video, screen share)
```

Backend Go berperan sebagai **orchestrator signaling** dan **Livekit token generator**. Semua media traffic (audio, video, screen share) mengalir langsung antara client dan Livekit server — tidak melewati backend Go.

### Alur Call

**Inisiasi:**

1. User A klik tombol call di chat/group
2. Frontend kirim event WS `call:initiate` ke backend
3. Backend buat Livekit room + generate token untuk A
4. Backend broadcast event `call:incoming` ke semua target via WS
5. Target terima notifikasi ringing di frontend

**Accept:**

1. User B kirim `call:accept`
2. Backend generate token Livekit untuk B
3. B join Livekit room dengan token tersebut

**Reject:**

1. User B kirim `call:reject`
2. Backend broadcast `call:rejected` ke semua participant

**End Call:**

1. Siapapun kirim `call:end`
2. Backend terminate Livekit room
3. Semua participant disconnect, menerima event `call:ended`

---

## Backend

### Database

Tabel `calls`:

```sql
CREATE TABLE calls (
    id               BIGSERIAL PRIMARY KEY,
    chat_room_id     BIGINT REFERENCES rooms(id),
    livekit_room_name VARCHAR(255) NOT NULL,
    initiated_by     BIGINT REFERENCES users(id),
    type             VARCHAR(10) NOT NULL CHECK (type IN ('audio', 'video')),
    status           VARCHAR(20) NOT NULL DEFAULT 'ringing'
                     CHECK (status IN ('ringing', 'active', 'ended', 'missed')),
    started_at       TIMESTAMP,
    ended_at         TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE call_participants (
    id         BIGSERIAL PRIMARY KEY,
    call_id    BIGINT REFERENCES calls(id),
    user_id    BIGINT REFERENCES users(id),
    joined_at  TIMESTAMP,
    left_at    TIMESTAMP,
    status     VARCHAR(20) CHECK (status IN ('invited', 'accepted', 'rejected', 'missed'))
);
```

### REST Endpoints

```
POST /api/calls/token          — minta Livekit token untuk join room
GET  /api/calls/:id            — detail call (status, participants)
POST /api/calls/:id/end        — end call (oleh initiator)
GET  /api/calls/history        — riwayat call user
```

**POST /api/calls/token** — Request:

```json
{ "call_id": 1 }
```

Response:

```json
{
	"success": true,
	"data": {
		"token": "<livekit-jwt>",
		"livekit_url": "wss://livekit.example.com"
	}
}
```

### WebSocket Events

**Client → Server:**
| Event | Payload | Keterangan |
|-------|---------|------------|
| `call:initiate` | `{room_id, type, participants[]}` | Mulai call |
| `call:accept` | `{call_id}` | Terima call |
| `call:reject` | `{call_id}` | Tolak call |
| `call:end` | `{call_id}` | Akhiri call |
| `call:busy` | `{call_id}` | Sedang di call lain |

**Server → Client:**
| Event | Payload | Keterangan |
|-------|---------|------------|
| `call:incoming` | `{call_id, type, initiator, room_name}` | Ada call masuk |
| `call:accepted` | `{call_id, user_id, token}` | Participant join |
| `call:rejected` | `{call_id, user_id}` | Participant tolak |
| `call:ended` | `{call_id}` | Call diakhiri |
| `call:participant_left` | `{call_id, user_id}` | Participant keluar |

### Livekit Integration

- Package Go: `github.com/livekit/server-sdk-go`
- Config via environment variables:
  - `LIVEKIT_URL` — URL Livekit server (e.g. `wss://livekit.yourdomain.com`)
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- Backend operations: **create room**, **generate access token**, **delete room**
- Lokasi kode: `internal/httpapi/call/` (handler + routes)

---

## Frontend

### Struktur Komponen

```md
components/call/
├── CallManager.jsx — global call state, handle WS events, di-mount di root App
├── IncomingCallModal.jsx — popup ringing (avatar, nama, tombol terima/tolak)
├── OutgoingCallModal.jsx — "Memanggil..." + tombol batalkan
├── CallRoom.jsx — full-screen call UI saat aktif
├── CallRoomMini.jsx — floating mini window (draggable, picture-in-picture)
├── ParticipantTile.jsx — tile video per participant
├── CallControls.jsx — mute, kamera, screen share, raise hand, end call
├── ParticipantList.jsx — sidebar daftar peserta + status (raise hand indicator)
└── CallChat.jsx — in-call chat panel
```

### UI States

1. **Incoming Call** — modal overlay dengan avatar caller, nama, tombol Terima (hijau) & Tolak (merah), suara dering
2. **Outgoing / Ringing** — modal kecil "Memanggil..." dengan nama target dan tombol batalkan
3. **Call Active (Full-screen)** — grid video participant (responsive layout), controls bar di bawah, sidebar participant list + chat bisa di-toggle, tombol minimize ke floating
4. **Floating Mini** — pojok kanan bawah, draggable, tampilkan dominant speaker video, tombol unmute & end, klik untuk kembali full-screen

### Packages Frontend

- `@livekit/components-react` — UI components siap pakai
- `livekit-client` — SDK untuk join room, publish track

### Integrasi di App

- `CallManager` di-mount di `App.jsx` agar bisa terima incoming call dari halaman manapun
- State call disimpan di Zustand store (`callStore`)

### Riwayat Call

- Section "Calls" di sidebar atau tab di ChatPage
- Tampilkan: icon jenis call (audio/video), nama/room, durasi, timestamp, tombol call balik

---

## Infrastruktur

### Livekit Self-Hosted (VPS)

- Deploy Livekit server di VPS `103.178.153.192` menggunakan Docker
- Konfigurasi TURN server untuk NAT traversal
- Expose port: `7880` (HTTP), `7881` (TCP), `7882` (UDP/RTP)
- SSL termination via reverse proxy (Nginx/Caddy)

---

## Error Handling

- Call timeout jika tidak ada yang menerima dalam 60 detik → status `missed`
- Jika initiator disconnect sebelum ada yang join → room dihapus otomatis
- Jika Livekit server tidak tersedia → tampilkan error dan rollback call status
- User sudah dalam call lain → kirim event `call:busy`
