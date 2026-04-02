import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
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
import { bookmarkService } from "../services/bookmarkService";
import { roomService } from "../services/roomService";
import toast from "react-hot-toast";
import {
	groupMessagesWithDateDividers,
	messageOnlyItems,
	createShouldShowAvatar,
	computeLastReadOwnMessageId,
} from "../lib/chatThreadUtils";

export function useDirectChatRoom(roomId) {
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
	const pinnedMsgRef = useRef(null);

	const [contact, setContact] = useState(null);
	const [isTyping, setIsTyping] = useState(false);
	const [replyTo, setReplyTo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showGallery, setShowGallery] = useState(false);
	const [pinnedMessage, setPinnedMessage] = useState(null);
	const { ongoingCalls, startCall, callHistory } = useCall();

	const rawMessages = useAppSelector((s) => selectMessagesByRoom(s, roomId));
	const [replyCache, setReplyCache] = useState({});
	const [readUpTo, setReadUpTo] = useState(0);
	const [bookmarkedIds, setBookmarkedIds] = useState([]);

	const isOnline = onlineUsers.includes(contact?.id);
	const contactName = contact?.username || contact?.email || "Pengguna";

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

				const payload = roomResult.payload;
				if (payload?.members) {
					const other = payload.members.find(
						(m) => Number(m.id) !== Number(user?.id),
					);
					if (other) {
						setContact(other);
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
				roomService.markRead(Number(roomId)).catch(() => {});
				bookmarkService
					.list()
					.then((res) => {
						const ids = (res.data.data || []).map((b) => b.message_id);
						if (!cancelled) setBookmarkedIds(ids);
					})
					.catch(() => {});
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

	useEffect(() => {
		const unsubTyping = on("typing", () => setIsTyping(true));
		const unsubStop = on("stop_typing", () => setIsTyping(false));
		return () => {
			unsubTyping();
			unsubStop();
		};
	}, [on]);

	useEffect(() => {
		return on("chat", (msg) => {
			if (Number(msg.from) !== Number(user?.id)) emitRead(msg.id);
		});
	}, [on, user, emitRead]);

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

	useEffect(() => {
		return on("room_deleted", ({ roomId: deletedRoomId }) => {
			if (Number(deletedRoomId) === Number(roomId)) navigate("/dashboard");
		});
	}, [on, roomId, navigate]);

	useEffect(() => {
		if (!isConnected || rawMessages.length === 0) return;
		const last = [...rawMessages]
			.reverse()
			.find((m) => Number(m.sender_id) !== Number(user?.id) && !m.optimistic);
		if (last?.id) emitRead(last.id);
	}, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

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

	const handleBookmark = useCallback(async (msgId, isCurrentlyBookmarked) => {
		try {
			if (isCurrentlyBookmarked) {
				await bookmarkService.remove(msgId);
				setBookmarkedIds((prev) => prev.filter((id) => id !== msgId));
				toast.success("Bookmark dihapus");
			} else {
				await bookmarkService.add(msgId);
				setBookmarkedIds((prev) => [...prev, msgId]);
				toast.success("Pesan disimpan");
			}
		} catch {
			toast.error("Gagal menyimpan pesan");
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

	const groupedMessages = useMemo(() => {
		if (loading || error) return [];
		const msgMap = Object.fromEntries(rawMessages.map((m) => [m.id, m]));
		const lastReadOwnId = computeLastReadOwnMessageId(
			rawMessages,
			user?.id,
			readUpTo,
		);
		const messages = rawMessages.map((m) => {
			let replyToRow = null;
			if (m.reply_to_id) {
				const parent = msgMap[m.reply_to_id] || replyCache[m.reply_to_id];
				const parentSenderId = parent?.sender_id ?? parent?.from;
				const parentName =
					Number(parentSenderId) === Number(user?.id) ?
						user?.username || "Saya"
					:	contactName;
				replyToRow = {
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
				replyTo: replyToRow,
				deleted: m.is_deleted,
				edited: !!m.edited_at,
				optimistic: m.optimistic,
			};
		});
		return groupMessagesWithDateDividers(messages);
	}, [loading, error, rawMessages, user, replyCache, readUpTo, contactName]);

	const msgItems = useMemo(
		() => messageOnlyItems(groupedMessages),
		[groupedMessages],
	);

	const shouldShowAvatar = useMemo(
		() => createShouldShowAvatar(msgItems),
		[msgItems],
	);

	const scrollToPinnedMessage = useCallback(() => {
		const el = document.getElementById(`msg-${pinnedMessage?.id}`);
		el?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [pinnedMessage?.id]);

	return {
		loading,
		error,
		contact,
		contactName,
		isOnline,
		user,
		isConnected,
		replyTo,
		setReplyTo,
		showGallery,
		setShowGallery,
		pinnedMessage,
		pinnedMsgRef,
		bookmarkedIds,
		ongoingCalls,
		startCall,
		callHistory,
		messagesEndRef,
		handleSend,
		handleTyping,
		handleDelete,
		handleBookmark,
		handlePin,
		handleDeleteRoom,
		doDeleteRoom,
		showDeleteConfirm,
		setShowDeleteConfirm,
		groupedMessages,
		shouldShowAvatar,
		isTyping,
		scrollToPinnedMessage,
	};
}
