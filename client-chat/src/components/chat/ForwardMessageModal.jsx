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
