# Zync Feature Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement missing and incomplete features in Zync — link preview UI, message forwarding, @mentions, markdown formatting, and dark mode.

**Architecture:** All tasks are frontend-only or light frontend additions. Backend APIs already exist for link preview (`GET /api/link-preview`) and message forwarding (`POST /api/messages/:msgId/forward`). @mentions, markdown, and dark mode are pure frontend features.

**Tech Stack:** React 19, Vite, Tailwind CSS 3, Redux Toolkit, Axios, Lucide Icons, React Hot Toast

---

## Phase A — Backend Gap Filling

### Task 1: Link Preview Service

**Files:**
- Create: `client-chat/src/services/linkPreviewService.js`
- Modify: `client-chat/src/services/messageService.js`

The backend endpoint `GET /api/link-preview?url=<url>` returns:
```json
{ "url": "...", "title": "...", "description": "...", "image": "...", "site_name": "..." }
```

- [ ] **Step 1: Add `forward` and `getLinkPreview` to messageService**

Open `client-chat/src/services/messageService.js` and add these two methods inside the `messageService` object:

```js
  forward: (msgId, roomIds) =>
    api.post(`/api/messages/${msgId}/forward`, { room_ids: roomIds }),

  getLinkPreview: (url) =>
    api.get(`/api/link-preview`, { params: { url } }),
```

- [ ] **Step 2: Verify the service file looks correct**

Run: `cat client-chat/src/services/messageService.js`
Expected: file now has `forward` and `getLinkPreview` methods.

- [ ] **Step 3: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/services/messageService.js
git commit -m "feat: add forward and getLinkPreview to messageService"
```

---

### Task 2: LinkPreviewCard Component

**Files:**
- Create: `client-chat/src/components/chat/LinkPreviewCard.jsx`

- [ ] **Step 1: Create the component**

Create `client-chat/src/components/chat/LinkPreviewCard.jsx`:

```jsx
import { ExternalLink } from "lucide-react";

const LinkPreviewCard = ({ preview, dark = false }) => {
  if (!preview?.title && !preview?.description) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-xl overflow-hidden border transition-opacity hover:opacity-90
        ${dark ? "border-white/20 bg-white/10" : "border-slate-200 bg-white shadow-sm"}`}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || ""}
          className="w-full h-32 object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <div className="px-3 py-2">
        {preview.site_name && (
          <p className={`text-xs mb-0.5 ${dark ? "text-white/50" : "text-slate-400"}`}>
            {preview.site_name}
          </p>
        )}
        {preview.title && (
          <p className={`text-sm font-semibold leading-tight line-clamp-2
            ${dark ? "text-white" : "text-slate-800"}`}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs mt-0.5 line-clamp-2
            ${dark ? "text-white/60" : "text-slate-500"}`}>
            {preview.description}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1.5 text-xs
          ${dark ? "text-white/40" : "text-slate-400"}`}>
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{preview.url}</span>
        </div>
      </div>
    </a>
  );
};

export default LinkPreviewCard;
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/components/chat/LinkPreviewCard.jsx
git commit -m "feat: add LinkPreviewCard component"
```

---

### Task 3: Wire Link Preview into MessageBubble

**Files:**
- Modify: `client-chat/src/components/chat/MessageBubble.jsx`

The message text is rendered as plain text at line ~507. We need to:
1. Detect if message text contains a URL
2. Fetch the preview (with caching to avoid re-fetching on re-render)
3. Render `LinkPreviewCard` below the message text

- [ ] **Step 1: Add URL detection util and hook at top of MessageBubble.jsx**

At the top of `client-chat/src/components/chat/MessageBubble.jsx`, after the existing imports, add:

```jsx
import { useEffect, useState } from "react"; // already imported, ensure useState is there
import LinkPreviewCard from "./LinkPreviewCard";
import { messageService } from "../../services/messageService";

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/;

function extractFirstUrl(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

const previewCache = {};

function useLinkPreview(text) {
  const [preview, setPreview] = useState(null);
  const url = extractFirstUrl(text);

  useEffect(() => {
    if (!url) return;
    if (previewCache[url]) {
      setPreview(previewCache[url]);
      return;
    }
    let cancelled = false;
    messageService.getLinkPreview(url)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data?.title || data?.description) {
          previewCache[url] = data;
          setPreview(data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  return preview;
}
```

- [ ] **Step 2: Use the hook in MessageBubble component**

In the `MessageBubble` component body (after line `const isBookmarked = ...`), add:

```jsx
  const linkPreview = useLinkPreview(!isDeleted ? message.text : null);
```

- [ ] **Step 3: Render LinkPreviewCard in own-message bubble**

Find the section in the `isOwn` return block where `message.text` is rendered (around line 505-510). It looks like:
```jsx
<p className='text-sm leading-relaxed break-words whitespace-pre-wrap'>
  {message.text}
</p>
```

After that `<p>` tag (still inside the same bubble div), add:
```jsx
{linkPreview && <LinkPreviewCard preview={linkPreview} dark />}
```

- [ ] **Step 4: Render LinkPreviewCard in other-message bubble**

Find the equivalent `<p>` tag in the non-own message branch, and after it add:
```jsx
{linkPreview && <LinkPreviewCard preview={linkPreview} />}
```

- [ ] **Step 5: Test manually**

Start the dev server: `cd client-chat && npm run dev`
Open a chat, send a message with a URL (e.g. `https://github.com`).
Expected: a preview card appears below the message text.

- [ ] **Step 6: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/components/chat/MessageBubble.jsx
git commit -m "feat: show link preview card in message bubbles"
```

---

### Task 4: Message Forwarding UI

**Files:**
- Create: `client-chat/src/components/chat/ForwardMessageModal.jsx`
- Modify: `client-chat/src/components/chat/MessageBubble.jsx`
- Modify: `client-chat/src/pages/ChatPage.jsx`
- Modify: `client-chat/src/pages/GroupChatPage.jsx`

The API is `POST /api/messages/:msgId/forward` with body `{ "room_ids": [1, 2] }`.

- [ ] **Step 1: Create ForwardMessageModal.jsx**

Create `client-chat/src/components/chat/ForwardMessageModal.jsx`:

```jsx
import { useState } from "react";
import { X, Send, Search } from "lucide-react";
import { useSelector } from "react-redux";
import { messageService } from "../../services/messageService";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";

const ForwardMessageModal = ({ message, onClose }) => {
  const rooms = useSelector((s) => s.rooms?.list ?? []);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const filtered = rooms.filter((r) =>
    r.name?.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleForward = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await messageService.forward(message.id, selectedIds);
      toast.success(`Pesan diteruskan ke ${selectedIds.length} room`);
      onClose();
    } catch {
      toast.error("Gagal meneruskan pesan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Teruskan Pesan</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari room..."
              className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filtered.map((room) => (
            <button
              key={room.id}
              onClick={() => toggle(room.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                ${selectedIds.includes(room.id)
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-slate-300"}`}>
                {selectedIds.includes(room.id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <Avatar name={room.name} size="sm" />
              <span className="text-sm text-slate-700 truncate">{room.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">Tidak ada room ditemukan</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={handleForward}
            disabled={!selectedIds.length || loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-xl
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? "Meneruskan..." : `Teruskan${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
```

- [ ] **Step 2: Add Forward icon import to MessageBubble.jsx**

In the lucide-react import at the top of `MessageBubble.jsx`, add `Forward`:
```jsx
import {
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  CornerUpLeft,
  FileText,
  Download,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Smile,
  X,
  ZoomIn,
  Forward,  // ADD THIS
} from "lucide-react";
```

Also add at top: `import ForwardMessageModal from "./ForwardMessageModal";`

- [ ] **Step 3: Add forward state and button to ContextMenu in MessageBubble**

The `ContextMenu` component (around line 280) accepts props. Add `onForward` prop:

Find the `ContextMenu` component definition:
```jsx
const ContextMenu = ({ x, y, onReply, onOpenThread, onCopy, onBookmark, isBookmarked, onPin, isPinned, isOwn, onClose, onDelete }) => {
```
Change to:
```jsx
const ContextMenu = ({ x, y, onReply, onOpenThread, onCopy, onBookmark, isBookmarked, onPin, isPinned, isOwn, onClose, onDelete, onForward }) => {
```

Inside the ContextMenu JSX, after the Copy button block, add:
```jsx
      {onForward && (
        <button
          onClick={onForward}
          className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
        >
          <Forward className='w-4 h-4 text-slate-500' />
          Teruskan
        </button>
      )}
```

- [ ] **Step 4: Wire forward state into MessageBubble component**

In the `MessageBubble` component:

Add state: `const [showForward, setShowForward] = useState(false);`

Add handler:
```jsx
  const handleForward = () => {
    setShowForward(true);
    setMenu(null);
  };
```

In the ContextMenu usage (there are two — one for `isOwn` and one for others), add `onForward={handleForward}` prop to both.

At the end of the component return (before the final `</>`), add:
```jsx
      {showForward && (
        <ForwardMessageModal
          message={message}
          onClose={() => setShowForward(false)}
        />
      )}
```

- [ ] **Step 5: Test manually**

Right-click any message in a chat room.
Expected: context menu shows "Teruskan" button.
Click it → modal opens showing list of rooms → select rooms → click Teruskan → toast success.

- [ ] **Step 6: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/components/chat/ForwardMessageModal.jsx \
        client-chat/src/components/chat/MessageBubble.jsx
git commit -m "feat: add message forwarding UI"
```

---

## Phase B — New Features

### Task 5: @Mentions in MessageInput

**Files:**
- Modify: `client-chat/src/components/chat/MessageInput.jsx`

This task adds `@username` autocomplete. When user types `@`, a dropdown appears with workspace members. Selecting one inserts `@username` into the message. No backend changes needed — highlighting and notification delivery are separate concerns.

- [ ] **Step 1: Add member list prop to MessageInput**

MessageInput's current signature:
```jsx
const MessageInput = ({ onSend, onTyping, replyTo, onCancelReply, roomId, onPollCreated }) => {
```
Change to:
```jsx
const MessageInput = ({ onSend, onTyping, replyTo, onCancelReply, roomId, onPollCreated, members = [] }) => {
```

`members` is an array of objects like `{ id, username, avatar }`.

- [ ] **Step 2: Add mention state variables inside MessageInput**

After `const [showSchedule, setShowSchedule] = useState(false);`, add:

```jsx
  const [mentionQuery, setMentionQuery] = useState(null); // null = closed, string = search query
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef(-1); // cursor pos where '@' was typed
```

- [ ] **Step 3: Add mention detection in the text change handler**

Find the textarea `onChange` handler. Currently it calls `setText` and `onTyping`. Replace with:

```jsx
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    onTyping?.();

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      mentionStartRef.current = cursor - atMatch[0].length;
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };
```

And update the textarea to use `onChange={handleTextChange}` instead of inline onChange.

- [ ] **Step 4: Handle keyboard navigation in the mention dropdown**

Find where the textarea handles `onKeyDown`. If none exists, add it. Add this handler:

```jsx
  const handleKeyDown = (e) => {
    if (mentionQuery === null) return;
    const filtered = members.filter((m) =>
      m.username?.toLowerCase().startsWith(mentionQuery)
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      insertMention(filtered[mentionIndex]);
    } else if (e.key === "Escape") {
      setMentionQuery(null);
    }
  };
```

Add `onKeyDown={handleKeyDown}` to the textarea element.

- [ ] **Step 5: Add insertMention helper**

Inside the component body, before the return:

```jsx
  const insertMention = (member) => {
    const before = text.slice(0, mentionStartRef.current);
    const after = text.slice(
      textareaRef.current?.selectionStart ?? text.length
    );
    const newText = `${before}@${member.username} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      const pos = (before + `@${member.username} `).length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    }, 0);
  };
```

- [ ] **Step 6: Render mention dropdown in the JSX**

In the return block, just before the closing div of the entire MessageInput wrapper, add:

```jsx
      {mentionQuery !== null && (() => {
        const filtered = members.filter((m) =>
          m.username?.toLowerCase().startsWith(mentionQuery)
        );
        if (!filtered.length) return null;
        return (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {filtered.slice(0, 8).map((m, i) => (
              <button
                key={m.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors
                  ${i === mentionIndex ? "bg-indigo-50" : ""}`}
              >
                <span className="font-medium text-indigo-600">@{m.username}</span>
              </button>
            ))}
          </div>
        );
      })()}
```

Make sure the MessageInput wrapper div has `className="relative ..."` (add `relative` if missing).

- [ ] **Step 7: Pass members to MessageInput in ChatPage**

In `client-chat/src/pages/ChatPage.jsx`, find the `<MessageInput>` usage and add:
```jsx
members={room?.members ?? []}
```

Do the same in `client-chat/src/pages/GroupChatPage.jsx`.

- [ ] **Step 8: Test manually**

Open a chat, type `@` followed by first letters of a member username.
Expected: dropdown appears with matching members. Arrow keys navigate. Enter/click inserts `@username ` into input.

- [ ] **Step 9: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/components/chat/MessageInput.jsx \
        client-chat/src/pages/ChatPage.jsx \
        client-chat/src/pages/GroupChatPage.jsx
git commit -m "feat: add @mention autocomplete in message input"
```

---

### Task 6: Message Markdown Formatting

**Files:**
- Modify: `client-chat/src/components/chat/MessageBubble.jsx`

No new library — implement a lightweight inline renderer that handles the most common patterns: `**bold**`, `*italic*`, `` `code` ``, and `\n` line breaks.

- [ ] **Step 1: Add renderMarkdown utility in MessageBubble.jsx**

At the top of `MessageBubble.jsx` (after imports), add:

```jsx
function renderMarkdown(text) {
  if (!text) return null;
  // Split by newlines, process each line
  const lines = text.split("\n");
  return lines.map((line, li) => {
    // Tokenize inline: **bold**, *italic*, `code`
    const tokens = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) tokens.push({ type: "text", value: line.slice(last, m.index) });
      if (m[2] !== undefined) tokens.push({ type: "bold", value: m[2] });
      else if (m[3] !== undefined) tokens.push({ type: "italic", value: m[3] });
      else if (m[4] !== undefined) tokens.push({ type: "code", value: m[4] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: "text", value: line.slice(last) });

    return (
      <span key={li}>
        {tokens.map((tok, ti) => {
          if (tok.type === "bold") return <strong key={ti}>{tok.value}</strong>;
          if (tok.type === "italic") return <em key={ti}>{tok.value}</em>;
          if (tok.type === "code")
            return (
              <code key={ti} className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">
                {tok.value}
              </code>
            );
          return <span key={ti}>{tok.value}</span>;
        })}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}
```

- [ ] **Step 2: Replace plain text render with renderMarkdown**

In MessageBubble, find all occurrences of:
```jsx
<p className='text-sm leading-relaxed break-words whitespace-pre-wrap'>
  {message.text}
</p>
```

Replace `{message.text}` with `{renderMarkdown(message.text)}` and remove `whitespace-pre-wrap` (line breaks are now handled by `<br />`):
```jsx
<p className='text-sm leading-relaxed break-words'>
  {renderMarkdown(message.text)}
</p>
```

Do this for both the `isOwn` and the other-user bubble.

- [ ] **Step 3: Test manually**

Send messages like:
- `**hello world**` → should render as bold
- `*italic text*` → italic
- `` `some code` `` → monospace inline code
- `line1\nline2` → two lines

- [ ] **Step 4: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/src/components/chat/MessageBubble.jsx
git commit -m "feat: render markdown formatting in message bubbles"
```

---

### Task 7: Dark Mode

**Files:**
- Modify: `client-chat/tailwind.config.js`
- Modify: `client-chat/src/main.jsx`
- Create: `client-chat/src/context/ThemeContext.jsx`
- Modify: `client-chat/src/components/layout/Sidebar.jsx` (add toggle button)
- Modify: `client-chat/src/components/layout/MainShell.jsx` (apply theme class)

Dark mode uses Tailwind's `class` strategy — add `dark` class to `<html>`. Components already use Tailwind so `dark:` variants will apply. This task sets up the infrastructure; full component dark-styling is a separate pass.

- [ ] **Step 1: Enable dark mode in tailwind.config.js**

Open `client-chat/tailwind.config.js`. Find the exported config object and add `darkMode: 'class'`:

```js
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 2: Create ThemeContext**

Create `client-chat/src/context/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("zync_theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("zync_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 3: Wrap app with ThemeProvider in main.jsx**

Open `client-chat/src/main.jsx`. Add import:
```jsx
import { ThemeProvider } from "./context/ThemeContext";
```

Wrap the existing root render with ThemeProvider:
```jsx
root.render(
  <ThemeProvider>
    <Provider store={store}>
      ...existing providers...
    </Provider>
  </ThemeProvider>
);
```

- [ ] **Step 4: Add dark mode toggle button to Sidebar**

Open `client-chat/src/components/layout/Sidebar.jsx`. Add imports:
```jsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
```

Inside the Sidebar component body, add:
```jsx
const { dark, toggle } = useTheme();
```

Find the bottom section of the Sidebar (usually near a user avatar or settings icon) and add the toggle button:
```jsx
<button
  onClick={toggle}
  title={dark ? "Mode Terang" : "Mode Gelap"}
  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
>
  {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

- [ ] **Step 5: Add base dark background to MainShell**

Open `client-chat/src/components/layout/MainShell.jsx`. Find the outermost wrapper div and add `dark:bg-slate-900 dark:text-slate-100` classes.

- [ ] **Step 6: Test manually**

Open the app. Click the Moon icon in sidebar.
Expected: `dark` class added to `<html>`, background darkens, preference persists on page reload.

- [ ] **Step 7: Commit**

```bash
cd "/Users/rizkiashari/Documents/Apps:Web/app-chatting"
git add client-chat/tailwind.config.js \
        client-chat/src/context/ThemeContext.jsx \
        client-chat/src/main.jsx \
        client-chat/src/components/layout/Sidebar.jsx \
        client-chat/src/components/layout/MainShell.jsx
git commit -m "feat: add dark mode with theme toggle in sidebar"
```

---

## Summary

| Task | Feature | Phase | Effort |
|------|---------|-------|--------|
| 1 | Add forward + getLinkPreview to messageService | A | 5 min |
| 2 | LinkPreviewCard component | A | 10 min |
| 3 | Wire link preview into MessageBubble | A | 20 min |
| 4 | Message forwarding UI (modal + context menu) | A | 30 min |
| 5 | @mentions autocomplete in MessageInput | B | 40 min |
| 6 | Markdown rendering in MessageBubble | B | 20 min |
| 7 | Dark mode (ThemeContext + toggle) | B | 30 min |

**Total estimated implementation time: ~2.5 hours**

After these are complete, further improvements:
- Apply `dark:` Tailwind variants to all major components (full dark mode pass)
- Global cross-room search (`GET /api/rooms/:id/messages/search` per room with aggregation)
- Per-room notification settings UI
- Full emoji picker (extend quick-emoji to full unicode set)
