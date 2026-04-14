# Global Search — Design Spec
**Date:** 2026-04-14
**Status:** Approved

---

## Overview

Tambah fitur Global Search di Zync yang memungkinkan user mencari pesan, user, room, dan file dari satu halaman terpusat. Entry point: halaman `/search` yang dapat diakses dari sidebar.

---

## Scope

Dapat dicari:
- **Pesan** — teks pesan di semua room yang user ikuti
- **User** — berdasarkan username (exclude diri sendiri)
- **Room** — berdasarkan nama room yang user ikuti
- **File** — berdasarkan nama file dari message attachments

---

## Backend

### Endpoint Baru

```
GET /api/search?q=&types=&room_id=&limit=
```

**Query params:**
| Param | Default | Keterangan |
|-------|---------|------------|
| `q` | — | Teks pencarian, min 2 karakter |
| `types` | `message,user,room,file` | Comma-separated, filter tipe |
| `room_id` | — | Optional, filter pesan dari room tertentu |
| `limit` | `10` | Per section, max 50 |

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "react",
    "messages": [
      {
        "id": 1,
        "body": "Pakai react hooks lebih clean",
        "room_id": 2,
        "room_name": "dev-general",
        "sender": { "id": 3, "username": "Andi", "avatar": "..." },
        "sent_at": 1714000000
      }
    ],
    "users": [
      { "id": 4, "username": "ReactDev", "avatar": "...", "is_online": true }
    ],
    "rooms": [
      { "id": 2, "name": "dev-general", "type": "group", "member_count": 5 }
    ],
    "files": [
      {
        "id": 7,
        "url": "/uploads/react-hooks-guide.pdf",
        "name": "react-hooks-guide.pdf",
        "mime": "application/pdf",
        "size": 1258291,
        "room_name": "resources",
        "room_id": 5,
        "sent_at": 1714000000
      }
    ]
  }
}
```

### Implementasi Go

- Lokasi: `internal/httpapi/search/` (handler + routes)
- Daftarkan di `internal/httpapi/router.go` dengan auth middleware
- 4 goroutines paralel, masing-masing:
  - **messages**: `ILIKE '%q%'` pada `body`, join rooms, filter by membership, exclude `is_deleted=true`
  - **users**: `ILIKE '%q%'` pada `username`, exclude current user
  - **rooms**: `ILIKE '%q%'` pada `name`, filter rooms yang user ikuti
  - **files**: messages dengan `body LIKE '{%"_type":"file"%'` dan nama file `ILIKE '%q%'`
- Semua query filter berdasarkan membership user yang sedang login

---

## Frontend

### Routing

Tambah route `/search` di `App.jsx` sebagai `ProtectedRoute`.

### Komponen

| File | Keterangan |
|------|------------|
| `src/pages/SearchPage.jsx` | Halaman utama `/search` |
| `src/services/searchService.js` | `global(q, params)` → `GET /api/search` |

### Layout

```
┌─────────────────────────────────────────────────┐
│  [🔍 Search bar full width]              [ESC]  │
├──────────────┬──────────────────────────────────┤
│ TIPE         │  PESAN · 18          Lihat semua →│
│  ● Semua 24  │  ┌──────────────────────────────┐│
│    Pesan 18  │  │ Avatar  Andi · #dev-general  ││
│    User   3  │  │ "...react hooks..."          ││
│    Room   2  │  └──────────────────────────────┘│
│    File   1  │                                   │
│              │  USER · 3                         │
│ WAKTU        │  ┌──────────────────────────────┐│
│  ● Kapan saja│  │ 🟢 ReactDev         [Chat]   ││
│    Hari ini  │  └──────────────────────────────┘│
│    Minggu ini│                                   │
│    Bulan ini │  FILE · 1                         │
│              │  ┌──────────────────────────────┐│
│              │  │ 📄 react-hooks-guide.pdf ↓   ││
│              │  └──────────────────────────────┘│
└──────────────┴──────────────────────────────────┘
```

### Search Trigger (Hybrid)

- **Real-time (debounce 300ms):** User & Room
- **On Enter:** Pesan & File
- Minimum 2 karakter untuk trigger request

### Navigasi dari Hasil

| Hasil | Aksi klik |
|-------|-----------|
| Pesan | Navigate ke `/chat/:userId` atau `/group/:groupId`, scroll ke pesan (#msg-{id}) |
| User | Buka DM via `roomService.openDirect(userId)` lalu navigate |
| Room | Navigate ke `/chat/:id` atau `/group/:id` |
| File | Download langsung via `messageService.fileUrl(url)` |

### Highlight Keyword

Teks hasil pesan di-highlight menggunakan regex replace, wrap dengan `<mark>` styled indigo.

---

## Data Flow

```
User ketik di SearchBar
  → debounce 300ms → fetch users + rooms
  → Enter → fetch messages + files

searchService.global(q, { types, limit })
  → GET /api/search?q=...

Backend:
  → 4 goroutines paralel
  → filter by membership
  → return unified JSON

SearchPage render:
  → grouped per section
  → sidebar filter update count
  → keyword highlight
```

---

## Error Handling & Edge Cases

| Kondisi | Perilaku |
|---------|----------|
| Query < 2 karakter | Tidak trigger request, tampilkan hint "Min. 2 karakter" |
| Section kosong | Empty state per section ("Tidak ada pesan ditemukan") |
| Network error | Toast error + retry button |
| Pesan dihapus (`is_deleted=true`) | Di-exclude di backend |
| User tidak ikut room | Pesan dari room tersebut tidak muncul (filter by membership) |
| VAPID/push tidak dikonfigurasi | Backend return 503, frontend skip silently |

---

## File yang Perlu Dibuat / Diubah

### Backend
- `internal/httpapi/search/handlers.go` — baru
- `internal/httpapi/search/routes.go` — baru
- `internal/httpapi/router.go` — daftarkan search route

### Frontend
- `src/pages/SearchPage.jsx` — baru
- `src/services/searchService.js` — baru
- `src/App.jsx` — tambah route `/search`
- `src/components/layout/Sidebar.jsx` — tambah link ke `/search`
