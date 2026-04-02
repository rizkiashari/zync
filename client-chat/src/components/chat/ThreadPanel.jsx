import { useState, useEffect, useRef, useCallback } from "react";
import { X, CornerDownRight, Send, Loader2 } from "lucide-react";
import Avatar from "../ui/Avatar";
import { messageService } from "../../services/messageService";
import { formatMessageTime } from "../../data/mockData";
import toast from "react-hot-toast";

const ThreadBubble = ({ message, isOwn, senderName }) => {
	const time = formatMessageTime(message.created_at || message.timestamp);
	return (
		<div className={`flex gap-2 mb-3 ${isOwn ? "flex-row-reverse" : ""}`}>
			<Avatar name={senderName} size="sm" className="flex-shrink-0" />
			<div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
				{!isOwn && (
					<span className="text-xs font-medium text-indigo-600 mb-0.5 ml-1">
						{senderName}
					</span>
				)}
				<div
					className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
						isOwn
							? "bg-indigo-600 text-white rounded-tr-sm"
							: "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
					}`}
				>
					{message.is_deleted ? (
						<span className="italic opacity-60">Pesan dihapus</span>
					) : (
						message.body || message.text
					)}
				</div>
				<span className="text-xs text-slate-400 mt-1 mx-1">{time}</span>
			</div>
		</div>
	);
};

const ThreadPanel = ({ parentMessage, currentUser, onClose, roomId, onSendReply }) => {
	const [replies, setReplies] = useState([]);
	const [loading, setLoading] = useState(true);
	const [replyText, setReplyText] = useState("");
	const [sending, setSending] = useState(false);
	const endRef = useRef(null);
	const textareaRef = useRef(null);

	const loadThread = useCallback(async () => {
		if (!parentMessage?.id) return;
		try {
			setLoading(true);
			const res = await messageService.getThread(parentMessage.id);
			const data = res.data?.data;
			setReplies(data?.replies || []);
		} catch {
			toast.error("Gagal memuat thread");
		} finally {
			setLoading(false);
		}
	}, [parentMessage?.id]);

	useEffect(() => {
		loadThread();
	}, [loadThread]);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [replies]);

	const handleSend = async () => {
		const text = replyText.trim();
		if (!text || sending) return;
		setSending(true);
		try {
			onSendReply?.(text, parentMessage.id);
			setReplyText("");
			// Optimistically add and then reload
			setTimeout(() => loadThread(), 500);
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const parentBody = parentMessage?.body || parentMessage?.text || "";
	const parentSender = parentMessage?.senderName || parentMessage?.sender?.username || "Pengguna";

	return (
		<div className="flex flex-col h-full w-80 border-l border-slate-200 bg-slate-50">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
				<div className="flex items-center gap-2">
					<CornerDownRight className="w-4 h-4 text-indigo-500" />
					<span className="font-semibold text-slate-800 text-sm">Thread</span>
					{replies.length > 0 && (
						<span className="text-xs text-slate-500">({replies.length} balasan)</span>
					)}
				</div>
				<button
					onClick={onClose}
					className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Parent message */}
			<div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
				<p className="text-xs font-semibold text-indigo-700 mb-1">{parentSender}</p>
				<p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap break-words">
					{parentBody}
				</p>
			</div>

			{/* Replies */}
			<div className="flex-1 overflow-y-auto px-4 py-3">
				{loading ? (
					<div className="flex justify-center py-6">
						<Loader2 className="w-5 h-5 animate-spin text-slate-400" />
					</div>
				) : replies.length === 0 ? (
					<p className="text-sm text-slate-400 text-center py-6">
						Belum ada balasan. Jadilah yang pertama!
					</p>
				) : (
					replies.map((msg) => (
						<ThreadBubble
							key={msg.id}
							message={msg}
							isOwn={msg.sender_id === currentUser?.id}
							senderName={msg.sender?.username || "Pengguna"}
						/>
					))
				)}
				<div ref={endRef} />
			</div>

			{/* Reply input */}
			<div className="px-4 py-3 border-t border-slate-200 bg-white">
				<div className="flex items-end gap-2">
					<textarea
						ref={textareaRef}
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Balas di thread..."
						rows={1}
						className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-24"
						style={{ overflowY: replyText.split("\n").length > 3 ? "auto" : "hidden" }}
					/>
					<button
						onClick={handleSend}
						disabled={!replyText.trim() || sending}
						className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors"
					>
						{sending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Send className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ThreadPanel;
