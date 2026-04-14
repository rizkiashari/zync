# Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah halaman `/search` yang memungkinkan user mencari pesan, user, room, dan file dari satu endpoint terpusat.

**Architecture:** Backend single endpoint `GET /api/search` di bawah workspace-scoped group, menjalankan 4 query paralel via goroutines dan return unified response. Frontend dedicated `SearchPage` dengan sidebar filter kiri + hasil grouped kanan, trigger hybrid (real-time untuk user/room, Enter untuk pesan/file).

**Tech Stack:** Go + Gin + GORM (backend), React 19 + Axios + Tailwind CSS (frontend)

---

## File Map

### Dibuat (baru)
| File | Tanggung jawab |
|------|---------------|
| `server-chat/internal/httpapi/search/handlers.go` | Handler `GET /api/search` — query 4 goroutines paralel |
| `server-chat/internal/httpapi/search/routes.go` | Daftarkan route ke wsGroup |
| `client-chat/src/services/searchService.js` | `global(q, params)` → `GET /api/search` |
| `client-chat/src/pages/SearchPage.jsx` | Halaman `/search` — search bar + sidebar filter + hasil |

### Dimodifikasi
| File | Perubahan |
|------|-----------|
| `server-chat/internal/httpapi/router.go` | Import + daftarkan `search.Register(wsGroup, ...)` |
| `client-chat/src/App.jsx` | Tambah route `/search` sebagai `ProtectedRoute` |
| `client-chat/src/components/layout/Sidebar.jsx` | Tambah tombol navigasi ke `/search` |

---

## Task 1: Backend — Handler & Routes

**Files:**
- Create: `server-chat/internal/httpapi/search/handlers.go`
- Create: `server-chat/internal/httpapi/search/routes.go`

- [ ] **Step 1: Buat file `routes.go`**

```go
// server-chat/internal/httpapi/search/routes.go
package search

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(
	wsGroup *gin.RouterGroup,
	msgs *repository.MessageRepository,
	users *repository.UserRepository,
	rooms *repository.RoomRepository,
) {
	wsGroup.GET("/search", handleSearch(msgs, users, rooms))
}
```

- [ ] **Step 2: Buat file `handlers.go`**

```go
// server-chat/internal/httpapi/search/handlers.go
package search

import (
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

const defaultLimit = 10
const maxLimit = 50

type messageResult struct {
	ID       uint   `json:"id"`
	Body     string `json:"body"`
	RoomID   uint   `json:"room_id"`
	RoomName string `json:"room_name"`
	RoomType string `json:"room_type"`
	Sender   struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar"`
	} `json:"sender"`
	SentAt int64 `json:"sent_at"`
}

type userResult struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	IsOnline bool   `json:"is_online"`
}

type roomResult struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	MemberCount int    `json:"member_count"`
}

type fileResult struct {
	ID       uint   `json:"id"`
	URL      string `json:"url"`
	Name     string `json:"name"`
	Mime     string `json:"mime"`
	Size     int64  `json:"size"`
	RoomName string `json:"room_name"`
	RoomID   uint   `json:"room_id"`
	SentAt   int64  `json:"sent_at"`
}

type searchData struct {
	Query    string          `json:"query"`
	Messages []messageResult `json:"messages"`
	Users    []userResult    `json:"users"`
	Rooms    []roomResult    `json:"rooms"`
	Files    []fileResult    `json:"files"`
}

func handleSearch(
	msgRepo *repository.MessageRepository,
	usersRepo *repository.UserRepository,
	roomsRepo *repository.RoomRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, ok := middleware.WorkspaceID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}

		q := strings.TrimSpace(c.Query("q"))
		if len([]rune(q)) < 2 {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Query must be at least 2 characters")
			return
		}

		limit := defaultLimit
		// types filter (tidak dipakai untuk routing tapi bisa dipakai nanti)
		// _ = c.Query("types")

		var (
			wg       sync.WaitGroup
			messages []messageResult
			users    []userResult
			rooms    []roomResult
			files    []fileResult
		)

		// --- goroutine: messages ---
		wg.Add(1)
		go func() {
			defer wg.Done()
			messages = searchMessages(msgRepo, usersRepo, roomsRepo, userID, workspaceID, q, limit)
		}()

		// --- goroutine: users ---
		wg.Add(1)
		go func() {
			defer wg.Done()
			users = searchUsers(usersRepo, userID, q, limit)
		}()

		// --- goroutine: rooms ---
		wg.Add(1)
		go func() {
			defer wg.Done()
			rooms = searchRooms(roomsRepo, userID, workspaceID, q, limit)
		}()

		// --- goroutine: files ---
		wg.Add(1)
		go func() {
			defer wg.Done()
			files = searchFiles(msgRepo, usersRepo, roomsRepo, userID, workspaceID, q, limit)
		}()

		wg.Wait()

		response.OK(c, searchData{
			Query:    q,
			Messages: messages,
			Users:    users,
			Rooms:    rooms,
			Files:    files,
		})
	}
}

func searchMessages(
	msgRepo *repository.MessageRepository,
	usersRepo *repository.UserRepository,
	roomsRepo *repository.RoomRepository,
	userID, workspaceID uint,
	q string,
	limit int,
) []messageResult {
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	like := "%" + q + "%"

	type row struct {
		models.Message
		RoomName string `gorm:"column:room_name"`
		RoomType string `gorm:"column:room_type"`
	}
	var rows []row
	err := msgRepo.DB().
		Table("messages m").
		Select("m.*, r.name AS room_name, r.type AS room_type").
		Joins("JOIN rooms r ON r.id = m.room_id").
		Joins("JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = ?", userID).
		Where("r.workspace_id = ? AND m.is_deleted = false AND m.body ILIKE ? AND m.body NOT LIKE '{\"_type\":\"file\"%'", workspaceID, like).
		Order("m.id DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil || len(rows) == 0 {
		return []messageResult{}
	}

	// collect sender IDs
	senderIDs := make([]uint, 0, len(rows))
	for _, r := range rows {
		senderIDs = append(senderIDs, r.SenderID)
	}
	var senders []models.User
	usersRepo.DB().Where("id IN ?", senderIDs).Find(&senders)
	senderMap := make(map[uint]models.User, len(senders))
	for _, s := range senders {
		senderMap[s.ID] = s
	}

	out := make([]messageResult, 0, len(rows))
	for _, r := range rows {
		mr := messageResult{
			ID:       r.ID,
			Body:     r.Body,
			RoomID:   r.RoomID,
			RoomName: r.RoomName,
			RoomType: r.RoomType,
			SentAt:   r.CreatedAt.Unix(),
		}
		if s, ok := senderMap[r.SenderID]; ok {
			mr.Sender.ID = s.ID
			mr.Sender.Username = s.Username
			mr.Sender.Avatar = s.Avatar
		}
		out = append(out, mr)
	}
	return out
}

func searchUsers(
	usersRepo *repository.UserRepository,
	currentUserID uint,
	q string,
	limit int,
) []userResult {
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	like := "%" + q + "%"
	var us []models.User
	err := usersRepo.DB().
		Where("id != ? AND (username ILIKE ? OR email ILIKE ?)", currentUserID, like, like).
		Order("username ASC").
		Limit(limit).
		Find(&us).Error
	if err != nil || len(us) == 0 {
		return []userResult{}
	}
	out := make([]userResult, 0, len(us))
	for _, u := range us {
		out = append(out, userResult{
			ID:       u.ID,
			Username: u.Username,
			Avatar:   u.Avatar,
			IsOnline: u.IsOnline,
		})
	}
	return out
}

func searchRooms(
	roomsRepo *repository.RoomRepository,
	userID, workspaceID uint,
	q string,
	limit int,
) []roomResult {
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	like := "%" + q + "%"
	type row struct {
		models.Room
		MemberCount int `gorm:"column:member_count"`
	}
	var rows []row
	err := roomsRepo.DB().
		Table("rooms r").
		Select("r.*, COUNT(rm2.user_id) AS member_count").
		Joins("JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ?", userID).
		Joins("LEFT JOIN room_members rm2 ON rm2.room_id = r.id").
		Where("r.workspace_id = ? AND r.name ILIKE ?", workspaceID, like).
		Group("r.id").
		Order("r.name ASC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil || len(rows) == 0 {
		return []roomResult{}
	}
	out := make([]roomResult, 0, len(rows))
	for _, r := range rows {
		out = append(out, roomResult{
			ID:          r.ID,
			Name:        r.Name,
			Type:        r.Type,
			MemberCount: r.MemberCount,
		})
	}
	return out
}

func searchFiles(
	msgRepo *repository.MessageRepository,
	usersRepo *repository.UserRepository,
	roomsRepo *repository.RoomRepository,
	userID, workspaceID uint,
	q string,
	limit int,
) []fileResult {
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	like := "%" + q + "%"

	type row struct {
		models.Message
		RoomName string `gorm:"column:room_name"`
	}
	var rows []row
	err := msgRepo.DB().
		Table("messages m").
		Select("m.*, r.name AS room_name").
		Joins("JOIN rooms r ON r.id = m.room_id").
		Joins("JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = ?", userID).
		Where("r.workspace_id = ? AND m.is_deleted = false AND m.body LIKE '{\"_type\":\"file\"%' AND m.body ILIKE ?", workspaceID, like).
		Order("m.id DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil || len(rows) == 0 {
		return []fileResult{}
	}

	out := make([]fileResult, 0, len(rows))
	for _, r := range rows {
		var meta struct {
			Type string `json:"_type"`
			URL  string `json:"url"`
			Name string `json:"name"`
			Mime string `json:"mime"`
			Size int64  `json:"size"`
		}
		if err2 := jsonUnmarshal([]byte(r.Body), &meta); err2 != nil {
			continue
		}
		out = append(out, fileResult{
			ID:       r.ID,
			URL:      meta.URL,
			Name:     meta.Name,
			Mime:     meta.Mime,
			Size:     meta.Size,
			RoomName: r.RoomName,
			RoomID:   r.RoomID,
			SentAt:   r.CreatedAt.Unix(),
		})
	}
	return out
}
```

- [ ] **Step 3: Tambah helper import di handlers.go — tambahkan ini di bawah file**

```go
// jsonUnmarshal is a thin wrapper untuk encoding/json — di-import agar tidak perlu
// import di level package.
import "encoding/json"
func jsonUnmarshal(data []byte, v any) error { return json.Unmarshal(data, v) }
```

> **Catatan:** Go tidak izinkan fungsi dan import terpisah di luar package block. Sebaliknya, tambahkan `"encoding/json"` ke import block di atas dan ganti semua `jsonUnmarshal(...)` dengan `json.Unmarshal(...)` langsung.

- [ ] **Step 4: Expose `DB()` di repositories yang belum punya method itu**

Cek apakah `MessageRepository`, `UserRepository`, dan `RoomRepository` sudah punya method `DB() *gorm.DB`. Jika belum, tambahkan di file repository masing-masing:

```go
// Tambahkan di server-chat/internal/repository/message.go
func (r *MessageRepository) DB() *gorm.DB { return r.db }
```

```go
// Tambahkan di server-chat/internal/repository/user.go
func (r *UserRepository) DB() *gorm.DB { return r.db }
```

```go
// Tambahkan di server-chat/internal/repository/room.go
func (r *RoomRepository) DB() *gorm.DB { return r.db }
```

- [ ] **Step 5: Verifikasi compile**

```bash
cd server-chat && go build ./...
```

Expected: tidak ada error. Jika ada "undefined: jsonUnmarshal", pastikan `encoding/json` di-import dan gunakan `json.Unmarshal` langsung.

- [ ] **Step 6: Commit**

```bash
cd server-chat
git add internal/httpapi/search/handlers.go internal/httpapi/search/routes.go
git add internal/repository/message.go internal/repository/user.go internal/repository/room.go
git commit -m "feat(search): add global search handler with 4 parallel queries"
```

---

## Task 2: Backend — Daftarkan Route di Router

**Files:**
- Modify: `server-chat/internal/httpapi/router.go`

- [ ] **Step 1: Tambah import `search`**

Di `router.go`, tambahkan di blok import (ikuti pola yang sudah ada):

```go
"zync-server/internal/httpapi/search"
```

- [ ] **Step 2: Daftarkan route di workspace-scoped group**

Di fungsi `NewRouter`, cari baris `scheduledmsgs.Register(wsGroup, d.ScheduledMsgs)` dan tambahkan sesudahnya:

```go
search.Register(wsGroup, d.Messages, d.Users, d.Rooms)
```

- [ ] **Step 3: Build & test manual**

```bash
cd server-chat && go build ./...
go run ./cmd/server
```

Test dengan curl (ganti TOKEN dengan JWT valid):

```bash
curl -H "Authorization: Bearer TOKEN" \
     -H "X-Workspace-Slug: YOUR_SLUG" \
     "http://localhost:8080/api/search?q=hello"
```

Expected response:
```json
{"success":true,"data":{"query":"hello","messages":[...],"users":[...],"rooms":[...],"files":[...]}}
```

- [ ] **Step 4: Commit**

```bash
git add internal/httpapi/router.go
git commit -m "feat(search): register /api/search route in router"
```

---

## Task 3: Frontend — searchService

**Files:**
- Create: `client-chat/src/services/searchService.js`

- [ ] **Step 1: Buat file service**

```js
// client-chat/src/services/searchService.js
import api from '../lib/api';

/**
 * @param {string} q - search query (min 2 chars)
 * @param {{ types?: string, limit?: number }} params
 */
export const searchService = {
  global: (q, params = {}) =>
    api.get('/api/search', { params: { q, ...params } }),
};
```

- [ ] **Step 2: Commit**

```bash
git add client-chat/src/services/searchService.js
git commit -m "feat(search): add searchService for global search API"
```

---

## Task 4: Frontend — SearchPage

**Files:**
- Create: `client-chat/src/pages/SearchPage.jsx`

- [ ] **Step 1: Buat SearchPage.jsx**

```jsx
// client-chat/src/pages/SearchPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainShell from "../components/layout/MainShell";
import { searchService } from "../services/searchService";
import { roomService } from "../services/roomService";
import { messageService } from "../services/messageService";
import {
  Search, User, Hash, FileText, MessageSquare,
  Download, ExternalLink, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const TYPE_FILTERS = [
  { key: "all",     label: "Semua" },
  { key: "message", label: "Pesan" },
  { key: "user",    label: "User" },
  { key: "room",    label: "Room" },
  { key: "file",    label: "File" },
];

const TIME_FILTERS = [
  { key: "any",   label: "Kapan saja" },
  { key: "today", label: "Hari ini" },
  { key: "week",  label: "Minggu ini" },
  { key: "month", label: "Bulan ini" },
];

function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-indigo-500 text-white px-0.5 rounded-sm">{part}</mark>
      : part
  );
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function timeAgo(unix) {
  if (!unix) return "";
  const diff = Math.floor((Date.now() - unix * 1000) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return new Date(unix * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("any");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Real-time untuk user & room: fetch setelah debounce
  const fetchRealtime = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return; }
    try {
      const res = await searchService.global(q, { types: "user,room", limit: 5 });
      const data = res.data?.data;
      setResults((prev) => ({
        messages: prev?.messages ?? [],
        files: prev?.files ?? [],
        users: data?.users ?? [],
        rooms: data?.rooms ?? [],
      }));
    } catch { /* silent */ }
  }, []);

  // On Enter: fetch pesan & file
  const fetchFull = useCallback(async (q) => {
    if (q.length < 2) return;
    setLoading(true);
    try {
      const res = await searchService.global(q, { limit: 10 });
      setResults(res.data?.data ?? null);
    } catch {
      toast.error("Gagal mencari. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRealtime(val), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceRef.current);
      fetchFull(query);
    }
    if (e.key === "Escape") navigate(-1);
  };

  const handleClickUser = async (user) => {
    try {
      const res = await roomService.openDirect(user.id);
      const roomId = res.data?.data?.id;
      if (roomId) navigate(`/chat/${roomId}`);
    } catch {
      toast.error("Gagal membuka chat");
    }
  };

  const handleClickRoom = (room) => {
    if (room.type === "group") navigate(`/group/${room.id}`);
    else navigate(`/chat/${room.id}`);
  };

  const handleClickMessage = (msg) => {
    if (msg.room_type === "group") navigate(`/group/${msg.room_id}`);
    else navigate(`/chat/${msg.room_id}`);
  };

  const handleDownloadFile = (file) => {
    window.open(messageService.fileUrl(file.url), "_blank");
  };

  // filter by type
  const msgs    = typeFilter === "all" || typeFilter === "message" ? (results?.messages ?? []) : [];
  const users   = typeFilter === "all" || typeFilter === "user"    ? (results?.users ?? [])    : [];
  const rooms   = typeFilter === "all" || typeFilter === "room"    ? (results?.rooms ?? [])    : [];
  const files   = typeFilter === "all" || typeFilter === "file"    ? (results?.files ?? [])    : [];

  const totalCount = (results?.messages?.length ?? 0) + (results?.users?.length ?? 0) +
                     (results?.rooms?.length ?? 0) + (results?.files?.length ?? 0);

  const countMap = {
    all: totalCount,
    message: results?.messages?.length ?? 0,
    user: results?.users?.length ?? 0,
    room: results?.rooms?.length ?? 0,
    file: results?.files?.length ?? 0,
  };

  return (
    <MainShell>
      <div className="flex flex-col h-full min-h-0">

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5 border border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
            {loading
              ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
              : <Search className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Cari pesan, user, room, file... (Enter untuk cari pesan)"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            {query && (
              <kbd className="text-slate-500 text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">ESC</kbd>
            )}
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-slate-500 mt-1.5 ml-1">Min. 2 karakter</p>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Sidebar filter */}
          <div className="w-44 flex-shrink-0 bg-slate-950 border-r border-slate-800 p-3 flex flex-col gap-5 overflow-y-auto">
            <div>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest mb-2">TIPE</p>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`w-full flex justify-between items-center px-2 py-1.5 rounded-md text-xs mb-0.5 transition-colors ${
                    typeFilter === f.key
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <span>{f.label}</span>
                  {results && (
                    <span className={`text-[10px] tabular-nums ${typeFilter === f.key ? "text-indigo-200" : "text-slate-600"}`}>
                      {countMap[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest mb-2">WAKTU</p>
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTimeFilter(f.key)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs mb-0.5 transition-colors ${
                    timeFilter === f.key
                      ? "bg-slate-700 text-slate-100"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Empty state */}
            {!results && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                <Search className="w-10 h-10" />
                <p className="text-sm">Ketik lalu tekan Enter untuk mencari</p>
              </div>
            )}

            {/* Messages */}
            {msgs.length > 0 && (
              <section>
                <p className="text-indigo-400 text-[10px] font-bold tracking-widest mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> PESAN · {results?.messages?.length}
                </p>
                <div className="space-y-2">
                  {msgs.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleClickMessage(m)}
                      className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded-lg p-3 flex gap-3 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        {m.sender?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-300 text-xs font-semibold truncate">
                            {m.sender?.username} <span className="text-slate-500 font-normal">· #{m.room_name}</span>
                          </span>
                          <span className="text-slate-600 text-[10px] flex-shrink-0 ml-2">{timeAgo(m.sent_at)}</span>
                        </div>
                        <p className="text-slate-400 text-xs truncate">{highlightText(m.body, query)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {(typeFilter === "all" || typeFilter === "message") && results && msgs.length === 0 && (
              <p className="text-slate-600 text-xs">Tidak ada pesan ditemukan</p>
            )}

            {/* Users */}
            {users.length > 0 && (
              <section>
                <p className="text-emerald-400 text-[10px] font-bold tracking-widest mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> USER · {results?.users?.length}
                </p>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="bg-slate-800 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {u.avatar
                          ? <img src={messageService.fileUrl(u.avatar)} className="w-8 h-8 rounded-full object-cover" alt="" />
                          : <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
                              {u.username?.[0]?.toUpperCase() ?? "?"}
                            </div>
                        }
                        {u.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-800" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs font-semibold">{u.username}</p>
                        <p className="text-slate-500 text-[10px]">{u.is_online ? "Online" : "Offline"}</p>
                      </div>
                      <button
                        onClick={() => handleClickUser(u)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                      >
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Rooms */}
            {rooms.length > 0 && (
              <section>
                <p className="text-sky-400 text-[10px] font-bold tracking-widest mb-2 flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> ROOM · {results?.rooms?.length}
                </p>
                <div className="space-y-2">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleClickRoom(r)}
                      className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded-lg p-3 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-sky-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs font-semibold truncate">{highlightText(r.name, query)}</p>
                        <p className="text-slate-500 text-[10px]">{r.member_count} anggota · {r.type}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Files */}
            {files.length > 0 && (
              <section>
                <p className="text-amber-400 text-[10px] font-bold tracking-widest mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> FILE · {results?.files?.length}
                </p>
                <div className="space-y-2">
                  {files.map((f) => (
                    <div key={f.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs font-semibold truncate">{highlightText(f.name, query)}</p>
                        <p className="text-slate-500 text-[10px]">{formatSize(f.size)} · #{f.room_name} · {timeAgo(f.sent_at)}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(f)}
                        className="text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                        title="Unduh"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </MainShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client-chat/src/pages/SearchPage.jsx
git commit -m "feat(search): add SearchPage with sidebar filter and grouped results"
```

---

## Task 5: Frontend — Route & Sidebar Link

**Files:**
- Modify: `client-chat/src/App.jsx`
- Modify: `client-chat/src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Tambah route di App.jsx**

Di `App.jsx`, tambahkan lazy import setelah import `FilesPage`:

```js
const SearchPage = lazy(() => import("./pages/SearchPage"));
```

Lalu tambahkan route di dalam blok `ProtectedRoute`, setelah route `/files`:

```jsx
<Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
```

- [ ] **Step 2: Tambah tombol Search di Sidebar.jsx**

Di `Sidebar.jsx`, import icon `Search` dari `lucide-react` (sudah ada). Cari blok tombol navigasi (sekitar baris yang ada `navigate("/bookmarks")`, `navigate("/files")`) dan tambahkan tombol baru:

```jsx
{/* Search */}
<button
  onClick={() => navigate("/search")}
  title="Cari"
  className={`p-2 rounded-lg transition-colors ${
    location.pathname === "/search"
      ? "bg-indigo-600 text-white"
      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  }`}
>
  <Search className="w-5 h-5" />
</button>
```

Tambahkan tombol ini **sebelum** tombol Bookmarks agar urutan logis: Search → Bookmarks → Files → Tasks → Pricing.

- [ ] **Step 3: Commit**

```bash
git add client-chat/src/App.jsx client-chat/src/components/layout/Sidebar.jsx
git commit -m "feat(search): add /search route and sidebar navigation button"
```

---

## Task 6: Smoke Test End-to-End

- [ ] **Step 1: Jalankan backend**

```bash
cd server-chat && go run ./cmd/server
```

- [ ] **Step 2: Jalankan frontend**

```bash
cd client-chat && npm run dev
```

- [ ] **Step 3: Login dan buka `/search`**

1. Login sebagai user yang sudah punya beberapa pesan & kontak
2. Klik ikon Search di sidebar → pastikan navigasi ke `/search`
3. Ketik 1 karakter → pastikan muncul hint "Min. 2 karakter"
4. Ketik 2+ karakter → user & room muncul real-time (tanpa Enter)
5. Tekan Enter → pesan & file muncul
6. Klik filter "Pesan" di sidebar → hanya section pesan yang tampil
7. Klik salah satu hasil pesan → navigasi ke room yang benar
8. Klik tombol "Chat" pada hasil user → buka DM

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: global search — /search page with backend + frontend"
```
