/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import MessageBubble from "../components/chat/MessageBubble";
import MessageInput from "../components/chat/MessageInput";
import { formatDateDivider } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useAppDispatch, useAppSelector } from "../store/index";
import {
	fetchRoomById,
	markRoomRead,
	removeRoom,
	upsertRoom,
} from "../store/roomsSlice";
import {
	fetchMessages,
	selectMessagesByRoom,
	addOptimisticMessage,
} from "../store/messagesSlice";
import { messageService } from "../services/messageService";
import { roomService } from "../services/roomService";
import ConfirmModal from "../components/ui/ConfirmModal";
import CallEventBubble from "../components/chat/CallEventBubble";
import MediaGallery from "../components/chat/MediaGallery";
import { useCall } from "../context/CallContext";
import { Phone, Video, Pin, X } from "lucide-react";
import toast from "react-hot-toast";

const TypingIndicator = () => (
	<div className='flex items-end gap-2 mb-2'>
		<div className='w-8 h-8 flex-shrink-0' />
		<div className='bg-white border border-slate-200/80 shadow-clean rounded-tr-2xl rounded-br-2xl rounded-tl-2xl px-4 py-3'>
			<div className='flex items-center gap-1'>
				<span
					className='w-2 h-2 bg-slate-400 rounded-full animate-bounce'
					style={{ animationDelay: "0ms" }}
				/>
				<span
					className='w-2 h-2 bg-slate-400 rounded-full animate-bounce'
					style={{ animationDelay: "150ms" }}
				/>
				<span
					className='w-2 h-2 bg-slate-400 rounded-full animate-bounce'
					style={{ animationDelay: "300ms" }}
				/>
			</div>
		</div>
	</div>
);

const DateDivider = ({ date }) => (
	<div className='flex items-center gap-3 my-4'>
		<div className='flex-1 h-px bg-slate-200' />
		<span className='text-xs text-slate-500 font-medium px-3 py-1 bg-slate-100 rounded-full'>
			{formatDateDivider(date)}
		</span>
		<div className='flex-1 h-px bg-slate-200' />
	</div>
);

const ChatPage = () => {
	const { roomId } = useParams();
	const { user } = useAuth();
	const {
		connectToRoom,
		disconnectRoom,
		sendMessage,
		emitTyping,
		emitStopTyping,
		emitRead,
		on,
		onlineUsers,
		isConnected,
	} = useSocket();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const messagesEndRef = useRef(null);
	const typingTimerRef = useRef(null);

	// Local state — contact is stored directly from API result to avoid shared Redux state conflicts
	const [contact, setContact] = useState(null);
	const [isTyping, setIsTyping] = useState(false);
	const [replyTo, setReplyTo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showGallery, setShowGallery] = useState(false);
	const [pinnedMessage, setPinnedMessage] = useState(null);
	const pinnedMsgRef = useRef(null);
	const { ongoingCalls, startCall, callHistory } = useCall();

	const rawMessages = useAppSelector((s) => selectMessagesByRoom(s, roomId));
	const isOnline = onlineUsers.includes(contact?.id);
	const [replyCache, setReplyCache] = useState({});
	// readUpTo: the msg_id up to which the other party has read
	const [readUpTo, setReadUpTo] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		setContact(null);

		const init = async () => {
			try {
				const [roomResult] = await Promise.all([
					dispatch(fetchRoomById(Number(roomId))),
					dispatch(fetchMessages({ roomId: Number(roomId) })),
				]);
				if (cancelled) return;

				// Extract contact directly from API result — don't rely on shared activeRoomMembers
				const payload = roomResult.payload;
				if (payload?.members) {
					const other = payload.members.find(
						(m) => Number(m.id) !== Number(user?.id),
					);
					if (other) {
						setContact(other);
						// Fix display name in sidebar for direct rooms
						if (payload.room) {
							dispatch(
								upsertRoom({
									...payload.room,
									name: other.username || other.email,
								}),
							);
						}
					}
				}

				// Load pinned message if any
				if (payload?.room?.pinned_message_id) {
					try {
						const pinRes = await messageService.getById(
							payload.room.pinned_message_id,
						);
						if (!cancelled) setPinnedMessage(pinRes.data.data);
					} catch {
						/* ignore */
					}
				}

				connectToRoom(Number(roomId));
				dispatch(markRoomRead(Number(roomId)));
				// Persist read state to server
				roomService.markRead(Number(roomId)).catch(() => {});
			} catch {
				if (!cancelled) setError("Gagal memuat percakapan");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		init();
		return () => {
			cancelled = true;
			disconnectRoom();
			document.title = "Zync";
		};
	}, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (contact) document.title = `${contact.username || contact.email} — Zync`;
	}, [contact]);

	// Typing listeners
	useEffect(() => {
		const unsubTyping = on("typing", () => setIsTyping(true));
		const unsubStop = on("stop_typing", () => setIsTyping(false));
		return () => {
			unsubTyping();
			unsubStop();
		};
	}, [on]);

	// Read receipt on incoming messages
	useEffect(() => {
		return on("chat", (msg) => {
			if (Number(msg.from) !== Number(user?.id)) emitRead(msg.id);
		});
	}, [on, user, emitRead]);

	// Track read receipts from the other party
	useEffect(() => {
		return on("read", (ev) => {
			if (
				Number(ev.room) === Number(roomId) &&
				Number(ev.user_id) !== Number(user?.id)
			) {
				setReadUpTo((prev) => Math.max(prev, Number(ev.msg_id)));
			}
		});
	}, [on, roomId, user]);

	// Auto-navigate away when this room is deleted by the other party
	useEffect(() => {
		return on("room_deleted", ({ roomId: deletedRoomId }) => {
			if (Number(deletedRoomId) === Number(roomId)) navigate("/dashboard");
		});
	}, [on, roomId, navigate]);

	// When WS connects, emit read for the latest unread message to persist to server
	useEffect(() => {
		if (!isConnected || rawMessages.length === 0) return;
		const last = [...rawMessages]
			.reverse()
			.find((m) => Number(m.sender_id) !== Number(user?.id) && !m.optimistic);
		if (last?.id) emitRead(last.id);
	}, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [rawMessages, isTyping]);

	const handleSend = useCallback(
		(text, _file, reply) => {
			if (!text || !roomId) return;
			dispatch(
				addOptimisticMessage({
					roomId: Number(roomId),
					senderId: user?.id,
					body: text,
					replyToId: reply?.id ?? null,
				}),
			);
			sendMessage(text, reply?.id);
			setReplyTo(null);
		},
		[sendMessage, dispatch, roomId, user],
	);

	const handleTyping = useCallback(
		(typing) => {
			if (typing) {
				emitTyping();
				clearTimeout(typingTimerRef.current);
				typingTimerRef.current = setTimeout(emitStopTyping, 3000);
			} else {
				emitStopTyping();
				clearTimeout(typingTimerRef.current);
			}
		},
		[emitTyping, emitStopTyping],
	);

	const handleDelete = useCallback(async (msgId) => {
		try {
			await messageService.delete(msgId);
		} catch {
			/* ignore */
		}
	}, []);

	const handlePin = useCallback(
		async (msgId, msg) => {
			try {
				await roomService.pinMessage(Number(roomId), msgId ?? 0);
				setPinnedMessage(msgId ? msg : null);
				toast.success(msgId ? "Pesan disematkan" : "Sematan dilepas");
			} catch {
				toast.error("Gagal menyematkan pesan");
			}
		},
		[roomId],
	);

	const handleDeleteRoom = useCallback(() => {
		setShowDeleteConfirm(true);
	}, []);

	const doDeleteRoom = useCallback(async () => {
		setShowDeleteConfirm(false);
		try {
			await roomService.deleteRoom(Number(roomId));
			dispatch(removeRoom(Number(roomId)));
			disconnectRoom();
			toast.success("Percakapan dihapus");
			navigate("/dashboard");
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal menghapus percakapan");
		}
	}, [roomId, dispatch, disconnectRoom, navigate]);

	if (loading) {
		return (
			<div className='flex h-screen bg-slate-50 overflow-hidden'>
				<Sidebar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex h-screen bg-slate-50 overflow-hidden'>
				<Sidebar />
				<div className='flex-1 flex items-center justify-center'>
					<p className='text-slate-500'>{error}</p>
				</div>
			</div>
		);
	}

	const contactName = contact?.username || contact?.email || "Pengguna";

	// Enrich reply-to previews — fetch missing parent messages once
	useEffect(() => {
		if (rawMessages.length === 0) return;
		const msgMap = Object.fromEntries(rawMessages.map((m) => [m.id, m]));
		const missingIds = [
			...new Set(
				rawMessages
					.filter(
						(m) =>
							m.reply_to_id &&
							!msgMap[m.reply_to_id] &&
							!replyCache[m.reply_to_id],
					)
					.map((m) => m.reply_to_id),
			),
		];
		if (missingIds.length === 0) return;
		missingIds.forEach(async (id) => {
			try {
				const res = await messageService.getById(id);
				const msg = res.data.data;
				setReplyCache((prev) => ({ ...prev, [id]: msg }));
			} catch {
				/* ignore */
			}
		});
	}, [rawMessages]); // eslint-disable-line react-hooks/exhaustive-deps

	// Normalize messages for display
	const msgMap = Object.fromEntries(rawMessages.map((m) => [m.id, m]));
	// Find last own non-optimistic message that was read by the other party
	const ownSentIds = rawMessages
		.filter(
			(m) =>
				Number(m.sender_id ?? m.from) === Number(user?.id) &&
				!m.optimistic &&
				m.id,
		)
		.map((m) => m.id);
	const lastReadOwnId =
		readUpTo > 0 ? ownSentIds.filter((id) => id <= readUpTo).at(-1) : null;

	const messages = rawMessages.map((m) => {
		let replyTo = null;
		if (m.reply_to_id) {
			const parent = msgMap[m.reply_to_id] || replyCache[m.reply_to_id];
			const parentSenderId = parent?.sender_id ?? parent?.from;
			const parentName =
				Number(parentSenderId) === Number(user?.id) ?
					user?.username || "Saya"
				:	contactName;
			replyTo = {
				id: m.reply_to_id,
				text: parent ? (parent.body ?? parent.text ?? "") : "Memuat...",
				senderName: parent ? parentName : "...",
			};
		}
		return {
			id: m.id,
			senderId: m.sender_id ?? m.from,
			senderName:
				Number(m.sender_id ?? m.from) === Number(user?.id) ?
					user?.username || "Saya"
				:	contactName,
			text: m.body ?? m.text ?? "",
			timestamp:
				m.created_at ?
					new Date(m.created_at)
				:	new Date((m.sent_at || 0) * 1000),
			read: lastReadOwnId != null && m.id <= lastReadOwnId,
			showRead: m.id === lastReadOwnId,
			replyTo,
			deleted: m.is_deleted,
			edited: !!m.edited_at,
			optimistic: m.optimistic,
		};
	});

	const groupedMessages = messages.reduce((groups, msg, i) => {
		const msgDate = new Date(msg.timestamp).toDateString();
		const prevDate =
			i > 0 ? new Date(messages[i - 1].timestamp).toDateString() : null;
		if (msgDate !== prevDate) {
			groups.push({ type: "divider", date: msg.timestamp, id: `divider_${i}` });
		}
		groups.push({ type: "message", ...msg });
		return groups;
	}, []);

	const msgItems = groupedMessages.filter((g) => g.type === "message");
	const shouldShowAvatar = (item) => {
		const idx = msgItems.findIndex((m) => m.id === item.id);
		if (idx < 0) return false;
		const next = msgItems[idx + 1];
		return !next || next.senderId !== item.senderId;
	};

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />
			<div className='flex-1 flex flex-col min-w-0'>
				<Header
					name={contactName}
					status={isOnline ? "online" : "offline"}
					avatar={contact?.avatar}
					onDelete={handleDeleteRoom}
					onGallery={() => setShowGallery(true)}
					roomId={Number(roomId)}
				/>
				{!isConnected && (
					<div className='bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-xs text-amber-600 text-center'>
						Menghubungkan ke server...
					</div>
				)}
				{pinnedMessage && (
					<div className='flex items-center gap-2 px-4 py-2 bg-amber-50/95 border-b border-amber-200/60'>
						<Pin
							className='w-3.5 h-3.5 text-amber-500 flex-shrink-0'
							aria-hidden
						/>
						<button
							type='button'
							ref={pinnedMsgRef}
							className='flex-1 min-w-0 text-left text-xs text-amber-900 truncate rounded-lg py-1 hover:bg-amber-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 focus-visible:ring-offset-amber-50'
							onClick={() => {
								const el = document.getElementById(`msg-${pinnedMessage.id}`);
								el?.scrollIntoView({ behavior: "smooth", block: "center" });
							}}
						>
							<span className='font-semibold'>Pesan disematkan: </span>
							{pinnedMessage.body || ""}
						</button>
						<button
							type='button'
							onClick={() => handlePin(null)}
							aria-label='Hapus sematan'
							className='min-h-9 min-w-9 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
						>
							<X className='w-3.5 h-3.5' />
						</button>
					</div>
				)}
				{ongoingCalls[Number(roomId)] && (
					<div className='flex items-center justify-between gap-3 px-4 py-2 bg-emerald-50/95 border-b border-emerald-200/60'>
						<div className='flex items-center gap-2 text-emerald-800 text-sm font-medium min-w-0'>
							{ongoingCalls[Number(roomId)] === "video" ?
								<Video className='w-4 h-4 shrink-0' />
							:	<Phone className='w-4 h-4 shrink-0' />}
							<span className='truncate'>
								{ongoingCalls[Number(roomId)] === "video" ?
									"Video call"
								:	"Voice call"}{" "}
								sedang berlangsung
							</span>
						</div>
						<button
							type='button'
							onClick={() =>
								startCall(Number(roomId), ongoingCalls[Number(roomId)])
							}
							className='shrink-0 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-full transition-colors shadow-clean focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2'
						>
							Gabung
						</button>
					</div>
				)}
				<div className='flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-slate-50 to-white'>
					<div className='max-w-2xl mx-auto space-y-0.5'>
						{groupedMessages.map((item) => {
							if (item.type === "divider")
								return <DateDivider key={item.id} date={item.date} />;
							const isOwn = Number(item.senderId) === Number(user?.id);
							return (
								<div key={item.id} id={`msg-${item.id}`}>
									<MessageBubble
										message={item}
										isOwn={isOwn}
										showAvatar={!isOwn && shouldShowAvatar(item)}
										senderName={contactName}
										onReply={setReplyTo}
										onDelete={handleDelete}
										onPin={handlePin}
										pinnedMessageId={pinnedMessage?.id}
									/>
									{isOwn && item.showRead && (
										<div className='flex justify-end pr-2 -mt-1 mb-1'>
											<span className='text-xs text-indigo-500 font-medium'>
												Dibaca
											</span>
										</div>
									)}
								</div>
							);
						})}
						{(callHistory[Number(roomId)] || []).map((ev) => (
							<CallEventBubble
								key={ev.id}
								event={{
									...ev,
									callerName:
										ev.callType === "call_started" ?
											Number(ev.from) === Number(user?.id) ?
												user?.username || "Kamu"
											:	contact?.username || contact?.email || "Pengguna"
										:	"",
								}}
							/>
						))}
						{isTyping && <TypingIndicator />}
						<div ref={messagesEndRef} />
					</div>
				</div>
				<MessageInput
					onSend={handleSend}
					onTyping={handleTyping}
					replyTo={replyTo}
					onCancelReply={() => setReplyTo(null)}
					roomId={Number(roomId)}
				/>
			</div>
			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={doDeleteRoom}
				title='Hapus Percakapan'
				message='Hapus percakapan ini? Semua pesan akan dihapus permanen.'
			/>
			{showGallery && (
				<MediaGallery roomId={Number(roomId)} onClose={() => setShowGallery(false)} />
			)}
		</div>
	);
};

export default ChatPage;
