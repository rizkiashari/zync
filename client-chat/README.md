# ChatApp — Client

Aplikasi web real-time chat berbasis **React + Vite** dengan koneksi **WebSocket** native. Mendukung percakapan pribadi, grup, manajemen profil, dan autentikasi pengguna.

---

## Tech Stack

| Teknologi          | Versi  | Kegunaan                |
| ------------------ | ------ | ----------------------- |
| React              | 19     | UI Framework            |
| Vite               | 8      | Build tool & dev server |
| Tailwind CSS       | 3      | Styling                 |
| React Router DOM   | 7      | Client-side routing     |
| Lucide React       | latest | Icon library            |
| React Hot Toast    | 2      | Notifikasi toast        |
| WebSocket (native) | —      | Real-time komunikasi    |

---

## Fitur

### Autentikasi

- **Login** — email + kata sandi, validasi form, show/hide password
- **Register** — nama lengkap, email, password + konfirmasi, indikator kekuatan sandi
- **Lupa Kata Sandi** — kirim link reset, tampilkan success state
- **Ubah Kata Sandi** — validasi password lama, indikator kekuatan sandi baru
- Sesi persisten via `localStorage`
- Protected routes — redirect ke `/login` jika belum autentikasi

### Chat Pribadi

- Percakapan real-time via WebSocket
- **Reply pesan** — klik kanan → Balas, tampil kutipan di bubble
- **Context menu** — Balas / Salin / Hapus (pesan sendiri)
- Typing indicator animasi (3 titik bouncing)
- Pemisah tanggal otomatis (Hari ini / Kemarin / tanggal)
- Tanda centang biru (pesan terkirim & terbaca)
- Status online/offline real-time dari WebSocket

### Chat Grup

- Buat grup baru dengan nama, deskripsi, dan pilih anggota
- Nama pengirim ditampilkan di atas bubble
- Panel info grup (daftar anggota, badge admin, keluar grup)
- Reply pesan & context menu sama seperti chat pribadi

### Input Pesan

- Textarea auto-expand (maks 3 baris)
- **Enter** kirim, **Shift+Enter** baris baru
- **Lampiran file** — image / dokumen, preview sebelum kirim, maks 10 MB
- Bar reply dengan nama & preview teks yang dibalas

### Dashboard

- Sapaan berdasarkan waktu (pagi/siang/sore/malam)
- Statistik: total pesan, grup aktif, belum dibaca, kontak online
- Percakapan terbaru & aksi cepat
- Daftar kontak sedang online

### Profil

- Edit nama, email, bio
- Ganti foto profil (tombol kamera)
- Statistik total pesan & grup diikuti
- Navigasi ke Ubah Kata Sandi & Logout

### Sidebar

- Tab filter: Semua / Pesan / Grup
- Pencarian percakapan (nama & isi pesan terakhir)
- **Indikator koneksi WebSocket** — ikon WiFi hijau/abu
- Status online pengguna dari WebSocket
- Dropdown buat chat baru / buat grup

---

## Struktur Proyek

```js
src/
├── context/
│   ├── AuthContext.jsx       # State autentikasi & localStorage
│   └── SocketContext.jsx     # Native WebSocket, reconnect otomatis
├── data/
│   └── mockData.js           # 10 kontak, 4 grup, pesan mock, helper format waktu
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── DashboardPage.jsx
│   ├── ChatPage.jsx
│   ├── GroupChatPage.jsx
│   ├── ProfilePage.jsx
│   └── ChangePasswordPage.jsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   └── Header.jsx
│   ├── chat/
│   │   ├── MessageBubble.jsx  # Bubble + context menu + reply preview
│   │   ├── MessageInput.jsx   # Input + reply bar + file attachment
│   │   └── ChatList.jsx
│   ├── group/
│   │   ├── CreateGroupModal.jsx
│   │   └── GroupInfo.jsx
│   └── ui/
│       ├── Avatar.jsx         # Inisial warna, dot online, 7 ukuran
│       ├── Button.jsx         # 5 varian, loading state
│       ├── Input.jsx          # Icon, show/hide password, error state
│       ├── Badge.jsx
│       └── Modal.jsx
└── App.jsx                    # Routes + protected/public route guard
```

---

## Instalasi & Menjalankan

```bash
# Masuk ke direktori
cd client-chat

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka `http://localhost:5173` di browser.

```bash
# Build untuk production
npm run build

# Preview hasil build
npm run preview
```

---

## Aplikasi mobile (Capacitor) — menjalankan iOS & Android pertama kali

Frontend ini dibungkus dengan **[Capacitor 7](https://capacitorjs.com/)**. Folder native berada di **`ios/`** dan **`android/`** (generate dari `cap add`).

### Prasyarat

| Platform | Yang dibutuhkan |
| -------- | ---------------- |
| **Umum** | **Node.js 20+**, **npm**, backend **Zync** (`server-chat`) bisa dijangkau dari emulator/perangkat |
| **iOS**  | **macOS**, **Xcode** (beserta *Command Line Tools*), **CocoaPods** (`sudo gem install cocoapods` atau via Homebrew) |
| **Android** | **Android Studio** (SDK, Platform Tools, setidaknya satu **emulator** atau perangkat USB dengan *USB debugging*) |

Pastikan backend berjalan (misalnya `http://localhost:8080` untuk web). Untuk **perangkat fisik** atau beberapa kasus jaringan, `localhost` di ponsel **bukan** komputer Anda — gunakan variabel **`VITE_API_URL`** (lihat di bawah).

### 1. Install dependensi

Dari folder **`client-chat`** (atau monorepo root dengan `npm install` agar workspace ikut terpasang):

```bash
cd client-chat
npm install
```

### 2. URL API untuk mobile (penting untuk perangkat fisik)

Secara bawaan:

- **Browser / iOS Simulator:** `http://localhost:8080` atau `http://127.0.0.1:8080`
- **Android Emulator:** `http://10.0.2.2:8080` (alias ke *host* mesin Anda)

Jika Anda mengetes di **perangkat fisik** / jaringan berbeda, buat file **`.env`** atau **`.env.local`** di `client-chat`:

```bash
# Ganti dengan IP LAN komputer yang menjalankan server-chat (tanpa slash di akhir)
VITE_API_URL=http://192.168.1.100:8080
```

Lalu **build ulang** dan **sync** (langkah 3). Proyek sudah mengizinkan HTTP cleartext untuk pengembangan (Android `usesCleartextTraffic`, iOS `NSAppTransportSecurity`); untuk rilis toko aplikasi sebaiknya pakai **HTTPS**.

### 3. Build web + sinkron ke native

Setiap kali Anda mengubah front-end produksi, jalankan:

```bash
cd client-chat
npm run build:mobile
```

Perintah ini menjalankan `vite build` lalu **`cap sync`** (menyalin `dist/` ke proyek iOS & Android).

### 4. iOS — pertama kali

1. **Satu kali** (jika belum): install *pods*  
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```
2. Buka Xcode:
   ```bash
   npm run cap:ios
   ```
3. Di Xcode, pilih **scheme** aplikasi **Zync**, lalu target **Simulator** atau perangkat.
4. Tekan **Run** (▶). Aplikasi memuat bundle web dari `ios/App/App/public` (hasil `cap sync`).

**Catatan:** Jika repo Anda di-*clone* di mesin baru, ulangi `pod install` di `ios/App` jika build iOS gagal.

### 5. Android — pertama kali

1. Buka proyek di Android Studio:
   ```bash
   npm run cap:android
   ```
2. Tunggu **Gradle Sync** selesai. Pastikan **JDK** yang dipakai Studio sesuai (biasanya *embedded JDK* di pengaturan).
3. Pilih **emulator** atau **perangkat** di toolbar, lalu **Run** (▶).

Folder **`android/gradle/wrapper/gradle-wrapper.jar`** harus ada agar `gradlew` jalan. Jika Gradle melaporkan *wrapper* rusak, *sync* ulang dari Android Studio atau unduh ulang JAR sesuai dokumentasi Gradle.

### 6. Perintah singkatan

| Perintah | Fungsi |
| -------- | ------ |
| `npm run build:mobile` | Build Vite + `cap sync` |
| `npm run cap:sync` | Hanya `cap sync` (setelah `npm run build` manual) |
| `npm run cap:ios` | `cap open ios` → Xcode |
| `npm run cap:android` | `cap open android` → Android Studio |

### Masalah yang sering muncul

- **Tidak bisa login / WebSocket gagal di ponsel:** pastikan `VITE_API_URL` mengarah ke IP/port yang benar, firewall mengizinkan koneksi, dan server *listen* di `0.0.0.0` (bukan hanya `127.0.0.1`) jika diakses dari jaringan LAN.
- **`cap: command not found`:** gunakan script npm di atas; CLI dipanggil lewat `./node_modules/.bin/cap` di `package.json`.
- **Android emulator tidak sampai ke backend:** gunakan `10.0.2.2` sebagai host (sudah menjadi bawaan di kode untuk platform Android tanpa `VITE_API_URL`).

---

## Koneksi WebSocket

Server WebSocket default: `ws://localhost:5000`

Ubah URL di `src/context/SocketContext.jsx`:

```js
const WS_URL = "ws://localhost:5000";
```

### Format Pesan

**Kirim ke server:**

```json
{ "type": "user_connected", "payload": { "userId": "...", "userName": "..." } }
{ "type": "join_room",      "payload": { "roomId": "..." } }
{ "type": "leave_room",     "payload": { "roomId": "..." } }
{ "type": "send_message",   "payload": { "roomId": "...", "message": { "id": "...", "text": "...", "senderId": "...", "senderName": "...", "timestamp": "ISO", "replyTo": null } } }
{ "type": "typing",         "payload": { "roomId": "...", "isTyping": true } }
```

**Terima dari server:**

```json
{ "type": "online_users",    "payload": ["userId1", "userId2"] }
{ "type": "receive_message", "payload": { "id": "...", "roomId": "...", "senderId": "...", "senderName": "...", "text": "...", "timestamp": "ISO", "replyTo": null } }
{ "type": "user_online",     "payload": { "userId": "..." } }
{ "type": "user_offline",    "payload": { "userId": "..." } }
{ "type": "typing",          "payload": { "roomId": "...", "senderId": "...", "isTyping": true } }
```

### Reconnect Otomatis

Client akan mencoba reconnect maksimal **5 kali** dengan interval **3 detik** jika koneksi terputus.

---

## Routes

| Path               | Halaman      | Akses     |
| ------------------ | ------------ | --------- |
| `/login`           | Login        | Public    |
| `/register`        | Daftar       | Public    |
| `/forgot-password` | Lupa Sandi   | Public    |
| `/dashboard`       | Dashboard    | Protected |
| `/chat/:userId`    | Chat Pribadi | Protected |
| `/group/:groupId`  | Chat Grup    | Protected |
| `/profile`         | Profil       | Protected |
| `/change-password` | Ubah Sandi   | Protected |

---

## Catatan Integrasi Backend

- **Autentikasi** — Ganti fungsi `login` dan `register` di `AuthContext.jsx` dengan panggilan ke endpoint API backend.
- **Data kontak & pesan** — Ganti `mockData.js` dengan fetch ke API untuk data real.
- **Upload file** — Implementasikan endpoint upload di server; kirim `FormData` dari `MessageInput`.
- **WebSocket URL** — Sesuaikan `WS_URL` di `SocketContext.jsx` dengan URL server production.
