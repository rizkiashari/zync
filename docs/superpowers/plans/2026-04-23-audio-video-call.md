# Audio/Video Call — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah fitur Raise Hand, Participant List, In-Call Chat, dan Floating Mini Window ke sistem call Zync yang sudah ada.

**Architecture:** Backend call signaling (token, start/end via WS) dan LiveKit SDK sudah berjalan. Plan ini fokus pada 4 fitur frontend yang belum ada. Floating mini window membutuhkan refactor: LiveKitRoom dipindah ke App.jsx level agar koneksi tetap hidup saat navigasi keluar dari CallPage.

**Tech Stack:** React, `@livekit/components-react`, `livekit-client` (data channel), Tailwind CSS

---

## Kondisi yang Sudah Ada (Jangan Diubah Kecuali Disebutkan)

- `client-chat/src/pages/CallPage.jsx` — full call UI, screen sharing, sawer, sticker
- `client-chat/src/context/CallContext.jsx` — global call state, WS listeners
- `client-chat/src/hooks/useCallEvents.js` — data channel hook (sticker/sawer)
- `client-chat/src/components/call/IncomingCallModal.jsx`
- `client-chat/src/services/callService.js`
- Backend `internal/httpapi/calls/` — token, start, end endpoints

---

## File Structure

### File Baru
- `client-chat/src/components/call/ParticipantList.jsx` — sidebar daftar peserta
- `client-chat/src/components/call/CallChat.jsx` — panel chat dalam call
- `client-chat/src/components/call/CallRoomMini.jsx` — floating mini window (global PiP)

### File Dimodifikasi
- `client-chat/src/hooks/useCallEvents.js` — tambah handler `raise_hand`, `lower_hand`, `chat`
- `client-chat/src/pages/CallPage.jsx` — tambah raise hand, participant list, in-call chat, tombol minimize
- `client-chat/src/context/CallContext.jsx` — tambah state `miniMode`
- `client-chat/src/App.jsx` — lift LiveKitRoom ke level App, render CallRoomMini global

---

## Task 1: Extend useCallEvents untuk Raise Hand dan Chat

**Files:**
- Modify: `client-chat/src/hooks/useCallEvents.js`

- [ ] **Step 1: Baca file saat ini**

  ```bash
  cat client-chat/src/hooks/useCallEvents.js
  ```

- [ ] **Step 2: Update handler DataReceived untuk terima raise_hand, lower_hand, chat**

  Ganti blok `if (msg.type === "sticker" || msg.type === "sawer")` dengan:

  ```js
  if (["sticker", "sawer", "raise_hand", "lower_hand", "chat"].includes(msg.type)) {
    pushEvent({
      ...msg,
      from:
        participant?.name ||
        participant?.identity ||
        "Seseorang",
    });
  }
  ```

- [ ] **Step 3: Tambah state `raisedHands` dan `chatMessages` ke return value**

  Tambah di atas `pushEvent`:

  ```js
  const [raisedHands, setRaisedHands] = useState(new Set()); // Set of identity strings
  const [chatMessages, setChatMessages] = useState([]); // [{id, from, text, ts}]
  ```

  Tambah handler raise_hand/lower_hand/chat di dalam `useEffect` DataReceived, setelah `pushEvent`:

  ```js
  if (msg.type === "raise_hand") {
    setRaisedHands((prev) => new Set([...prev, participant?.identity ?? ""]));
  } else if (msg.type === "lower_hand") {
    setRaisedHands((prev) => {
      const next = new Set(prev);
      next.delete(participant?.identity ?? "");
      return next;
    });
  } else if (msg.type === "chat") {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random()}`,
        from: participant?.name || participant?.identity || "Seseorang",
        text: msg.text,
        ts: new Date(),
      },
    ]);
  }
  ```

- [ ] **Step 4: Return `raisedHands` dan `chatMessages` dari hook**

  ```js
  return { events, sendEvent, raisedHands, chatMessages };
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add client-chat/src/hooks/useCallEvents.js
  git commit -m "feat: extend useCallEvents with raise_hand and chat data channel support"
  ```

---

## Task 2: Participant List Sidebar

**Files:**
- Create: `client-chat/src/components/call/ParticipantList.jsx`

- [ ] **Step 1: Buat komponen ParticipantList**

  ```jsx
  // client-chat/src/components/call/ParticipantList.jsx
  import { useParticipants, useLocalParticipant } from "@livekit/components-react";
  import { Hand, Mic, MicOff, Video, VideoOff, X } from "lucide-react";

  const ParticipantList = ({ raisedHands, onClose }) => {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();

    const allParticipants = [localParticipant, ...participants.filter(
      (p) => p.identity !== localParticipant.identity
    )];

    return (
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-[#2a2d30] border-l border-white/10 flex flex-col z-20">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white text-sm font-semibold">
            Peserta ({allParticipants.length})
          </span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Tutup daftar peserta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto py-2">
          {allParticipants.map((p) => {
            const isLocal = p.identity === localParticipant.identity;
            const isMuted = !p.isMicrophoneEnabled;
            const isCamOff = !p.isCameraEnabled;
            const hasRaisedHand = raisedHands.has(p.identity);

            return (
              <li
                key={p.identity}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {(p.name || p.identity)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  {hasRaisedHand && (
                    <span className="absolute -top-1 -right-1 text-sm">✋</span>
                  )}
                </div>

                <span className="flex-1 text-white text-xs truncate">
                  {p.name || p.identity}
                  {isLocal && <span className="text-white/40 ml-1">(Kamu)</span>}
                </span>

                <div className="flex items-center gap-1">
                  {isMuted
                    ? <MicOff className="w-3.5 h-3.5 text-red-400" />
                    : <Mic className="w-3.5 h-3.5 text-white/40" />
                  }
                  {isCamOff
                    ? <VideoOff className="w-3.5 h-3.5 text-red-400" />
                    : <Video className="w-3.5 h-3.5 text-white/40" />
                  }
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  export default ParticipantList;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client-chat/src/components/call/ParticipantList.jsx
  git commit -m "feat: add ParticipantList sidebar component for call"
  ```

---

## Task 3: In-Call Chat Panel

**Files:**
- Create: `client-chat/src/components/call/CallChat.jsx`

- [ ] **Step 1: Buat komponen CallChat**

  ```jsx
  // client-chat/src/components/call/CallChat.jsx
  import { useState, useRef, useEffect } from "react";
  import { Send, X } from "lucide-react";

  const CallChat = ({ messages, onSend, onClose }) => {
    const [text, setText] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = (e) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setText("");
    };

    return (
      <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#2a2d30] border-l border-white/10 flex flex-col z-20">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white text-sm font-semibold">Chat</span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Tutup chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-white/30 text-xs text-center mt-4">
              Belum ada pesan
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <span className="text-white/50 text-[10px]">{msg.from}</span>
              <div className="bg-white/10 rounded-lg px-3 py-2 text-white text-xs break-words">
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-3 border-t border-white/10"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1 bg-white/10 text-white text-xs rounded-full px-3 py-2 outline-none placeholder:text-white/30 focus:ring-1 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 flex items-center justify-center transition-colors"
            aria-label="Kirim pesan"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </div>
    );
  };

  export default CallChat;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client-chat/src/components/call/CallChat.jsx
  git commit -m "feat: add CallChat panel component for in-call messaging"
  ```

---

## Task 4: Integrasikan Raise Hand, Participant List, dan CallChat ke CallPage

**Files:**
- Modify: `client-chat/src/pages/CallPage.jsx`

- [ ] **Step 1: Baca file saat ini**

  ```bash
  cat client-chat/src/pages/CallPage.jsx
  ```

- [ ] **Step 2: Tambah import baru di bagian atas file**

  Setelah baris import terakhir yang ada, tambahkan:

  ```jsx
  import { Hand } from "lucide-react";
  import ParticipantList from "../components/call/ParticipantList";
  import CallChat from "../components/call/CallChat";
  ```

- [ ] **Step 3: Tambah state baru di VideoLayout dan VoiceLayout**

  Di dalam `VideoLayout` (dan `VoiceLayout`), setelah baris `const [showSticker, setShowSticker] = useState(false);`, tambahkan:

  ```jsx
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  ```

- [ ] **Step 4: Destructure tambahan dari useCallEvents**

  Ubah baris:
  ```jsx
  const { events, sendEvent } = useCallEvents();
  ```
  Menjadi:
  ```jsx
  const { events, sendEvent, raisedHands, chatMessages } = useCallEvents();
  ```

- [ ] **Step 5: Tambah handler raise hand dan send chat**

  Setelah `handleSendSticker`, tambahkan:

  ```jsx
  const handleToggleHand = useCallback(() => {
    const nextRaised = !handRaised;
    setHandRaised(nextRaised);
    sendEvent(nextRaised ? "raise_hand" : "lower_hand", {});
  }, [handRaised, sendEvent]);

  const handleSendChat = useCallback(
    (text) => {
      sendEvent("chat", { text });
    },
    [sendEvent],
  );
  ```

- [ ] **Step 6: Tambah ParticipantList dan CallChat ke JSX**

  Di dalam div `relative` yang membungkus area video (sebelum `<RoomAudioRenderer />`), tambahkan setelah `</CallEventOverlay>` (atau bagian terakhir konten area video):

  ```jsx
  {showParticipants && (
    <ParticipantList
      raisedHands={raisedHands}
      onClose={() => setShowParticipants(false)}
    />
  )}

  {showChat && (
    <CallChat
      messages={chatMessages}
      onSend={handleSendChat}
      onClose={() => setShowChat(false)}
    />
  )}
  ```

- [ ] **Step 7: Tambah tombol Raise Hand, Participants, dan Chat ke toolbar**

  Tambahkan sebelum `<EndBtn onClick={onEndCall} />`:

  ```jsx
  {/* Raise hand */}
  <CtrlBtn
    active={handRaised}
    onClick={handleToggleHand}
    label={handRaised ? "Turunkan tangan" : "Angkat tangan"}
  >
    <Hand className={`w-5 h-5 ${handRaised ? "text-yellow-300" : "text-white"}`} />
  </CtrlBtn>

  {/* Participant list */}
  <CtrlBtn
    active={showParticipants}
    onClick={() => {
      setShowParticipants((v) => !v);
      setShowChat(false);
    }}
    label="Daftar peserta"
  >
    <Users className="w-5 h-5 text-white" />
  </CtrlBtn>

  {/* In-call chat */}
  <CtrlBtn
    active={showChat}
    onClick={() => {
      setShowChat((v) => !v);
      setShowParticipants(false);
    }}
    label="Chat"
  >
    <MessageSquare className="w-5 h-5 text-white" />
  </CtrlBtn>
  ```

- [ ] **Step 8: Tambah import MessageSquare ke import lucide-react**

  Cari baris import lucide-react dan tambahkan `MessageSquare`:

  ```jsx
  import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Users,
    RotateCcw,
    Coins,
    SmilePlus,
    Monitor,
    MonitorOff as MonitorStopIcon,
    Hand,
    MessageSquare,
  } from "lucide-react";
  ```

  (Hapus `import { Hand } from "lucide-react";` yang ditambahkan di step 2 — gabungkan ke sini)

- [ ] **Step 9: Ulangi langkah 3–8 untuk VoiceLayout**

  VoiceLayout juga perlu state dan handler yang sama. Salin state, handler, komponen panel, dan tombol toolbar ke `VoiceLayout`.

- [ ] **Step 10: Commit**

  ```bash
  git add client-chat/src/pages/CallPage.jsx
  git commit -m "feat: add raise hand, participant list, and in-call chat to CallPage"
  ```

---

## Task 5: Floating Mini Window (Global PiP)

Ini adalah refactor paling besar: LiveKitRoom dipindah ke `App.jsx` level.

**Files:**
- Create: `client-chat/src/components/call/CallRoomMini.jsx`
- Modify: `client-chat/src/context/CallContext.jsx`
- Modify: `client-chat/src/pages/CallPage.jsx`
- Modify: `client-chat/src/App.jsx`

### Sub-Task 5a: Tambah miniMode ke CallContext

- [ ] **Step 1: Baca CallContext**

  ```bash
  cat client-chat/src/context/CallContext.jsx
  ```

- [ ] **Step 2: Tambah state miniMode**

  Setelah baris `const [activeCall, setActiveCall] = useState(null);`, tambahkan:

  ```js
  const [miniMode, setMiniMode] = useState(false);
  ```

- [ ] **Step 3: Expose miniMode dan setMiniMode di value context**

  Di object yang di-pass ke `CallContext.Provider value={}`, tambahkan:

  ```js
  miniMode,
  setMiniMode,
  ```

- [ ] **Step 4: Reset miniMode saat endCall**

  Cari fungsi `endCall` (atau bagian yang membersihkan `activeCall`) dan tambahkan `setMiniMode(false);` di sana.

- [ ] **Step 5: Commit**

  ```bash
  git add client-chat/src/context/CallContext.jsx
  git commit -m "feat: add miniMode state to CallContext"
  ```

### Sub-Task 5b: Buat CallRoomMini component

- [ ] **Step 1: Buat komponen CallRoomMini**

  ```jsx
  // client-chat/src/components/call/CallRoomMini.jsx
  import { useState, useRef, useEffect, useCallback } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    VideoTrack,
    RoomAudioRenderer,
    useTracks,
    useLocalParticipant,
  } from "@livekit/components-react";
  import { Track } from "livekit-client";
  import { PhoneOff, Maximize2, Mic, MicOff } from "lucide-react";
  import { useCall } from "../../context/CallContext";

  const CallRoomMini = () => {
    const { activeCall, endCall, setMiniMode } = useCall();
    const navigate = useNavigate();
    const [muted, setMuted] = useState(false);
    const { localParticipant } = useLocalParticipant();

    // Position state for dragging
    const [pos, setPos] = useState({ x: window.innerWidth - 220, y: window.innerHeight - 180 });
    const dragging = useRef(false);
    const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    const remoteCameraTrack = useTracks([Track.Source.Camera]).find(
      (t) => !t.participant.isLocal
    );

    const handleMouseDown = (e) => {
      dragging.current = true;
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    };

    useEffect(() => {
      const onMove = (e) => {
        if (!dragging.current) return;
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
      };
      const onUp = () => { dragging.current = false; };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }, []);

    const handleExpand = useCallback(() => {
      setMiniMode(false);
      navigate(`/call/${activeCall.roomId}?kind=${activeCall.kind}`);
    }, [setMiniMode, navigate, activeCall]);

    const handleEnd = useCallback(() => {
      endCall(Number(activeCall.roomId));
    }, [endCall, activeCall]);

    const handleToggleMic = useCallback(() => {
      localParticipant.setMicrophoneEnabled(muted);
      setMuted((m) => !m);
    }, [localParticipant, muted]);

    return (
      <div
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-50 w-48 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black select-none"
        onMouseDown={handleMouseDown}
      >
        {remoteCameraTrack ? (
          <VideoTrack
            trackRef={remoteCameraTrack}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#202124] flex items-center justify-center">
            <span className="text-white/30 text-xs">Menunggu…</span>
          </div>
        )}

        <RoomAudioRenderer />

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={handleToggleMic}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label={muted ? "Nyalakan mikrofon" : "Mute"}
          >
            {muted
              ? <MicOff className="w-3.5 h-3.5 text-white" />
              : <Mic className="w-3.5 h-3.5 text-white" />
            }
          </button>
          <button
            onClick={handleExpand}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="Perluas"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={handleEnd}
            className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
            aria-label="Akhiri call"
          >
            <PhoneOff className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    );
  };

  export default CallRoomMini;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client-chat/src/components/call/CallRoomMini.jsx
  git commit -m "feat: add CallRoomMini floating PiP component"
  ```

### Sub-Task 5c: Lift LiveKitRoom ke App.jsx

- [ ] **Step 1: Baca App.jsx**

  ```bash
  cat client-chat/src/App.jsx
  ```

- [ ] **Step 2: Tambah GlobalCallSession di App.jsx**

  Import yang dibutuhkan di `App.jsx`:

  ```jsx
  import { LiveKitRoom } from "@livekit/components-react";
  import { useCall } from "./context/CallContext";
  import CallRoomMini from "./components/call/CallRoomMini";
  ```

  Buat komponen `GlobalCallSession` di `App.jsx` (di atas komponen `App`):

  ```jsx
  // Renders a persistent LiveKitRoom session when a call is active.
  // In mini mode, shows the floating PiP. In full mode, renders nothing here
  // (CallPage will render the full UI inside the same LK room via context).
  const GlobalCallSession = () => {
    const { activeCall, miniMode, endCall } = useCall();

    if (!activeCall) return null;

    const handleDisconnect = () => {
      // LK disconnected unexpectedly — clean up
      if (miniMode) endCall(Number(activeCall.roomId));
    };

    return (
      <LiveKitRoom
        serverUrl={activeCall.liveKitUrl}
        token={activeCall.token}
        connect
        video={activeCall.kind === "video"}
        audio
        onDisconnected={handleDisconnect}
        style={{ display: "contents" }}
      >
        {miniMode && <CallRoomMini />}
      </LiveKitRoom>
    );
  };
  ```

  Di dalam return statement komponen `App`, tambahkan `<GlobalCallSession />` sebelum `</BrowserRouter>` (atau setelah `<IncomingCallModal />`):

  ```jsx
  <GlobalCallSession />
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client-chat/src/App.jsx
  git commit -m "feat: lift LiveKitRoom to App level for persistent call session"
  ```

### Sub-Task 5d: Modifikasi CallPage agar tidak buat LiveKitRoom sendiri

- [ ] **Step 1: Baca CallPage.jsx saat ini**

  ```bash
  cat client-chat/src/pages/CallPage.jsx
  ```

- [ ] **Step 2: Hapus LiveKitRoom dari CallPage dan gunakan context yang sudah ada**

  Di komponen `CallPage`, hapus `<LiveKitRoom>` wrapper. Ganti seluruh bagian:

  ```jsx
  <LiveKitRoom
    serverUrl={callData.liveKitUrl}
    token={callData.token}
    connect
    video={isVideo}
    audio
    onDisconnected={handleLKDisconnect}
    className='flex-1 flex flex-col overflow-hidden'
  >
    {isVideo ? (
      <VideoLayout onEndCall={handleLeaveBtn} callData={callData} />
    ) : (
      <VoiceLayout onEndCall={handleLeaveBtn} />
    )}
  </LiveKitRoom>
  ```

  Menjadi:

  ```jsx
  <div className='flex-1 flex flex-col overflow-hidden'>
    {isVideo ? (
      <VideoLayout onEndCall={handleLeaveBtn} callData={callData} />
    ) : (
      <VoiceLayout onEndCall={handleLeaveBtn} />
    )}
  </div>
  ```

  Hapus juga import `LiveKitRoom` dari `@livekit/components-react` di CallPage jika tidak dipakai lagi.

- [ ] **Step 3: Tambah tombol Minimize ke header CallPage**

  Di header CallPage (bagian yang tampilkan "Video Call" / "Voice Call"), tambahkan tombol minimize:

  ```jsx
  import { Minimize2 } from "lucide-react";
  ```

  Di header JSX, sebelum div live indicator, tambahkan:

  ```jsx
  <button
    onClick={() => {
      setMiniMode(true);
      navigate(returnPath, { replace: true });
    }}
    className="mr-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
    aria-label="Perkecil ke mini window"
  >
    <Minimize2 className="w-4 h-4 text-white" />
  </button>
  ```

  Destructure `setMiniMode` dari `useCall()`:

  ```jsx
  const { activeCall, endCall, setMiniMode } = useCall();
  ```

- [ ] **Step 4: Hapus handler handleLKDisconnect (tidak relevan lagi)**

  `handleLKDisconnect` dipanggil oleh `LiveKitRoom.onDisconnected` yang sudah dipindah ke `GlobalCallSession`. Hapus handler tersebut dari `CallPage`.

- [ ] **Step 5: Commit**

  ```bash
  git add client-chat/src/pages/CallPage.jsx
  git commit -m "feat: remove LiveKitRoom from CallPage, use global session from App"
  ```

---

## Task 6: Test Manual End-to-End

- [ ] **Step 1: Jalankan dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Test skenario 1 — Full call flow**
  - Login dengan 2 akun di 2 tab browser berbeda
  - User A mulai video call dari group chat
  - User B terima incoming call modal
  - User B klik Terima → keduanya masuk CallPage
  - Verifikasi: video grid tampil, audio berjalan

- [ ] **Step 3: Test skenario 2 — Raise Hand**
  - Di dalam call, User A klik tombol Raise Hand
  - Verifikasi: User A lihat indikator tangan terangkat di toolbar (active state)
  - Verifikasi: User B lihat toast notifikasi raise hand
  - User A klik lagi → tangan turun

- [ ] **Step 4: Test skenario 3 — Participant List**
  - Klik tombol Users di toolbar
  - Verifikasi: sidebar muncul dengan daftar peserta
  - Verifikasi: status mute/cam off tampil
  - Verifikasi: indikator raise hand tampil di samping nama

- [ ] **Step 5: Test skenario 4 — In-Call Chat**
  - Klik tombol Chat di toolbar
  - Kirim pesan dari User A
  - Verifikasi: User B menerima pesan di panel chat

- [ ] **Step 6: Test skenario 5 — Floating Mini Window**
  - Klik tombol Minimize (Minimize2 icon) di header CallPage
  - Verifikasi: navigasi kembali ke halaman sebelumnya
  - Verifikasi: floating mini window muncul di pojok kanan bawah
  - Verifikasi: audio tetap berjalan
  - Drag mini window ke posisi lain
  - Klik expand icon → kembali ke CallPage full screen
  - Klik end call di mini window → call berakhir bersih

- [ ] **Step 7: Test skenario 6 — End Call**
  - User A klik End Call
  - Verifikasi: keduanya di-redirect keluar CallPage
  - Verifikasi: mini window (jika aktif) hilang
  - Verifikasi: `call_ended` event tercatat di callHistory

- [ ] **Step 8: Commit final**

  ```bash
  git add -A
  git commit -m "feat: complete audio/video call — raise hand, participant list, in-call chat, mini PiP"
  ```
