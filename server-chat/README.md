# Server Chat — Realtime Chat Backend

Backend REST + WebSocket untuk aplikasi chat realtime menggunakan Go, PostgreSQL, dan JWT.

---

## Stack

| Komponen  | Teknologi                            |
| --------- | ------------------------------------ |
| Language  | Go 1.25                              |
| Framework | Gin                                  |
| Database  | PostgreSQL (GORM)                    |
| Realtime  | WebSocket (gorilla/websocket)        |
| Auth      | JWT (golang-jwt/jwt) + Refresh Token |
| Docs      | Swagger (swaggo)                     |

---

## Cara Menjalankan

```bash
# 1. Salin env lokal (development)
cp .env.local.example .env.local
# Edit DATABASE_DSN, JWT_SECRET, dll.

# 2. (Opsional) Postgres via Docker — interpolasi variabel memakai file yang sama:
docker compose --env-file .env.local up -d db

# 3. Jalankan server (memuat .env.local; GO_ENV=production memuat .env.prod)
go run ./cmd/server
```

Swagger UI tersedia di: `http://localhost:8080/swagger/index.html`

---

## Semua Endpoint API

### Auth

| Method | Endpoint         | Deskripsi                                  | Auth   |
| ------ | ---------------- | ------------------------------------------ | ------ |
| POST   | `/auth/register` | Daftar akun baru                           | -      |
| POST   | `/auth/login`    | Login, dapat access + refresh token        | -      |
| POST   | `/auth/refresh`  | Perbarui access token dengan refresh token | -      |
| POST   | `/auth/logout`   | Logout (revoke refresh token)              | Bearer |

**Register / Login Request:**

```json
{
	"email": "user@example.com",
	"password": "password123",
	"username": "john" // opsional saat register
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"access_token": "eyJ...",
		"refresh_token": "a1b2c3...",
		"user": { "id": 1, "email": "...", "username": "john" }
	}
}
```

**Refresh Token:**

```json
{ "refresh_token": "a1b2c3..." }
```

---

### Profile

| Method | Endpoint                | Deskripsi                    |
| ------ | ----------------------- | ---------------------------- |
| GET    | `/api/profile`          | Lihat profil sendiri         |
| PUT    | `/api/profile`          | Update username, avatar, bio |
| PUT    | `/api/profile/password` | Ganti password               |

**Update Profile:**

```json
{
	"username": "john_doe",
	"avatar": "https://...",
	"bio": "Hello world"
}
```

**Ganti Password:**

```json
{
	"current_password": "oldpass",
	"new_password": "newpass123"
}
```

---

### Users

| Method | Endpoint                | Deskripsi                      |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/users?search=xxx` | Cari pengguna lain             |
| GET    | `/api/users/:id`        | Lihat profil user tertentu     |
| POST   | `/api/users/block`      | Blokir user `{ "user_id": 5 }` |
| DELETE | `/api/users/block/:id`  | Batalkan blokir                |
| GET    | `/api/users/blocked`    | Daftar user yang diblokir      |

---

### Dashboard

| Method | Endpoint         | Deskripsi                         |
| ------ | ---------------- | --------------------------------- |
| GET    | `/api/dashboard` | Stats + daftar room + user online |

**Response:**

```json
{
  "stats": { "room_count": 5, "online_users": 3 },
  "rooms": [...],
  "online_users": [...]
}
```

---

### Rooms (Group & Direct)

| Method | Endpoint                              | Deskripsi                         | Role   |
| ------ | ------------------------------------- | --------------------------------- | ------ |
| GET    | `/api/rooms`                          | Daftar semua room saya            | Member |
| POST   | `/api/rooms/group`                    | Buat grup baru                    | -      |
| POST   | `/api/rooms/direct`                   | Buka / buat DM dengan user        | -      |
| GET    | `/api/rooms/:id`                      | Detail room + daftar member       | Member |
| PUT    | `/api/rooms/:id`                      | Update nama/deskripsi grup        | Admin  |
| PUT    | `/api/rooms/:id/pin`                  | Pin / unpin pesan                 | Admin  |
| POST   | `/api/rooms/:id/members`              | Tambah member ke grup             | Admin  |
| DELETE | `/api/rooms/:id/members/:userId`      | Hapus member dari grup            | Admin  |
| PUT    | `/api/rooms/:id/members/:userId/role` | Ubah role member                  | Admin  |
| DELETE | `/api/rooms/:id/leave`                | Keluar dari room                  | Member |
| POST   | `/api/rooms/:id/invite`               | Generate / regenerate invite link | Admin  |
| POST   | `/api/invite/:token`                  | Bergabung lewat invite link       | -      |

**Buat Grup:**

```json
{ "name": "Tim Backend", "description": "Diskusi backend" }
```

**Buat DM:**

```json
{ "user_id": 5 }
```

**Pin Pesan:**

```json
{ "message_id": 42 } // null = unpin
```

**Ubah Role:**

```json
{ "role": "admin" } // "admin" | "member"
```

---

### Messages

| Method | Endpoint                                   | Deskripsi                  |
| ------ | ------------------------------------------ | -------------------------- |
| GET    | `/api/rooms/:roomId/messages`              | Riwayat pesan (pagination) |
| GET    | `/api/rooms/:roomId/messages/search?q=xxx` | Cari pesan di room         |
| PUT    | `/api/messages/:msgId`                     | Edit pesan sendiri         |
| DELETE | `/api/messages/:msgId`                     | Hapus pesan sendiri        |
| GET    | `/api/messages/:msgId/reactions`           | Lihat reaksi pada pesan    |
| POST   | `/api/messages/:msgId/reactions`           | Tambah reaksi              |
| DELETE | `/api/messages/:msgId/reactions/:emoji`    | Hapus reaksi               |

**Query params riwayat:**

- `limit` — jumlah pesan (default 50, max 100)
- `before_id` — pagination ke atas (cursor-based)

**Edit Pesan:**

```json
{ "body": "Teks yang sudah diedit" }
```

**Tambah Reaksi:**

```json
{ "emoji": "👍" }
```

---

### Notifications

| Method | Endpoint                      | Deskripsi                        |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/api/notifications?limit=50` | Daftar notifikasi + unread count |
| PUT    | `/api/notifications/read`     | Tandai semua sudah dibaca        |
| PUT    | `/api/notifications/:id/read` | Tandai satu notifikasi dibaca    |

---

## WebSocket

### Koneksi

```
GET /ws?room=<roomId>
Authorization: Bearer <access_token>
```

Token bisa juga dikirim via query: `/ws?room=1&token=<jwt>`

---

### Format Pesan (Client → Server)

#### Kirim Pesan

```json
{ "type": "chat", "text": "Halo semua!" }
```

#### Balas Pesan (Reply)

```json
{ "type": "chat", "text": "Oke!", "reply_to_id": 42 }
```

#### Indikator Mengetik

```json
{ "type": "typing" }
{ "type": "stop_typing" }
```

#### Read Receipt

```json
{ "type": "read", "msg_id": 99 }
```

---

### Format Event (Server → Client)

#### Pesan Baru

```json
{
	"type": "chat",
	"id": 101,
	"from": 3,
	"room": 1,
	"text": "Halo semua!",
	"reply_to_id": 42,
	"sent_at": 1714000000
}
```

#### Indikator Mengetik

```json
{ "type": "typing",      "user_id": 3, "room": 1 }
{ "type": "stop_typing", "user_id": 3, "room": 1 }
```

#### Read Receipt

```json
{ "type": "read", "user_id": 3, "room": 1, "msg_id": 99 }
```

#### Online / Offline Presence

```json
{ "type": "presence", "user_id": 3, "online": true  }
{ "type": "presence", "user_id": 3, "online": false }
```

---

## Response Format

Semua endpoint mengembalikan format yang konsisten:

**Sukses:**

```json
{ "success": true, "data": { ... } }
```

**Error:**

```json
{
	"success": false,
	"error": {
		"code": "INVALID_BODY",
		"message": "Invalid or malformed request body"
	}
}
```

### Kode Error

| Code                       | HTTP | Keterangan                             |
| -------------------------- | ---- | -------------------------------------- |
| `UNAUTHORIZED`             | 401  | Tidak ada token atau token tidak valid |
| `INVALID_TOKEN`            | 401  | Token kadaluarsa atau salah            |
| `INVALID_CREDENTIALS`      | 401  | Email/password salah                   |
| `FORBIDDEN`                | 403  | Tidak punya akses                      |
| `NOT_FOUND`                | 404  | Resource tidak ditemukan               |
| `INVALID_BODY`             | 400  | Request body salah format              |
| `EMAIL_ALREADY_REGISTERED` | 409  | Email sudah terdaftar                  |
| `USERNAME_TAKEN`           | 409  | Username sudah digunakan               |
| `ALREADY_MEMBER`           | 409  | User sudah jadi member                 |
| `NOT_MEMBER`               | 404  | User bukan member room                 |
| `INTERNAL_ERROR`           | 500  | Kesalahan server                       |

---

## Data Model

### User

| Field        | Tipe   | Keterangan        |
| ------------ | ------ | ----------------- |
| id           | uint   | Primary key       |
| email        | string | Unique            |
| username     | string | Display name      |
| avatar       | string | URL avatar        |
| bio          | string | Deskripsi singkat |
| is_online    | bool   | Status online     |
| last_seen_at | time   | Terakhir aktif    |

### Room

| Field             | Tipe   | Keterangan         |
| ----------------- | ------ | ------------------ |
| id                | uint   | Primary key        |
| type              | string | `group` / `direct` |
| name              | string | Nama grup          |
| description       | string | Deskripsi grup     |
| creator_id        | uint   | ID pembuat         |
| pinned_message_id | uint   | Pesan yang dipin   |
| invite_token      | string | Token undangan     |

### Message

| Field       | Tipe   | Keterangan                   |
| ----------- | ------ | ---------------------------- |
| id          | uint   | Primary key                  |
| room_id     | uint   | FK ke Room                   |
| sender_id   | uint   | FK ke User                   |
| body        | string | Isi pesan                    |
| reply_to_id | uint   | ID pesan yang dibalas        |
| edited_at   | time   | Waktu edit (null jika belum) |
| is_deleted  | bool   | Soft delete                  |

---

## Arsitektur

```
cmd/server/main.go          — entry point, inisialisasi deps
internal/
  auth/                     — JWT service
  config/                   — konfigurasi .env
  database/                 — koneksi + auto-migrate
  hub/                      — WebSocket broadcast hub
  models/                   — GORM models
  repository/               — database layer
  transport/websocket/      — WebSocket client handler
  httpapi/
    authroute/              — register, login, refresh, logout
    profile/                — profil pengguna
    users/                  — listing & block users
    rooms/                  — manajemen room & member
    messages/               — riwayat, edit, delete, reactions
    dashboard/              — statistik & overview
    notifications/          — notifikasi & mention
    middleware/             — Bearer JWT middleware
    response/               — envelope helper
```
