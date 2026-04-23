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
