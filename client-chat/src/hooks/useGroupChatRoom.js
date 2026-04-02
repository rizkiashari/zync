import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
import { useAppDispatch, useAppSelector } from "../store/index";
import {
	fetchRoomById,
	selectRoomById,
	markRoomRead,
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
} from "../lib/chatThreadUtils";

export function useGroupChatRoom(groupId) {
	const { user } = useAuth();
	const { ongoingCalls, startCall, callHistory } = useCall();
	const {
		connectToRoom,
		disconnectRoom,
		sendMessage,
		emitTyping,
		emitStopTyping,
		emitRead,
		on,
		isConnected,
	} = useSocket();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const messagesEndRef = useRef(null);
	const typingTimerRef = useRef(null);

	const [showInfo, setShowInfo] = useState(false);
	const [showGallery, setShowGallery] = useState(false);
	const [typingUser, setTypingUser] = useState(null);
	const [replyTo, setReplyTo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pinnedMessage, setPinnedMessage] = useState(null);

	const room = useAppSelector((s) => selectRoomById(s, Number(groupId)));
	const rawMessages = useAppSelector((s) => selectMessagesByRoom(s, groupId));

	const [members, setMembers] = useState([]);
	const [replyCache, setReplyCache] = useState({});
	const [bookmarkedIds, setBookmarkedIds] = useState([]);

	const memberMap = useMemo(
		() =>
			Object.fromEntries(
				members.map((m) => [m.id, m.username || m.email || `User ${m.id}`]),
			),
		[members],
	);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		const init = async () => {
			try {
				const [roomResult] = await Promise.all([
					dispatch(fetchRoomById(Number(groupId))),
					dispatch(fetchMessages({ roomId: Number(groupId) })),
				]);
				if (cancelled) return;
				if (roomResult.payload?.members) {
					setMembers(roomResult.payload.members);
				}
				if (roomResult.payload?.room?.pinned_message_id) {
					try {
						const pinRes = await messageService.getById(
							roomResult.payload.room.pinned_message_id,
						);
						if (!cancelled) setPinnedMessage(pinRes.data.data);
					} catch {
						/* ignore */
					}
				}
				connectToRoom(Number(groupId));
				dispatch(markRoomRead(Number(groupId)));
				roomService.markRead(Number(groupId)).catch(() => {});
				bookmarkService
					.list()
					.then((res) => {
						const ids = (res.data.data || []).map((b) => b.message_id);
						if (!cancelled) setBookmarkedIds(ids);
					})
					.catch(() => {});
			} catch {
				if (!cancelled) navigate("/dashboard");
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
	}, [groupId, connectToRoom, disconnectRoom, dispatch, navigate]);

	useEffect(() => {
		if (room) document.title = `${room.name || "Grup"} — Zync`;
	}, [room]);

	useEffect(() => {
		return on("chat", (msg) => {
			if (msg.from !== user?.id) emitRead(msg.id);
		});
	}, [on, user, emitRead]);

	useEffect(() => {
		if (!isConnected || rawMessages.length === 0) return;
		const last = [...rawMessages]
			.reverse()
			.find((m) => Number(m.sender_id) !== Number(user?.id) && !m.optimistic);
		if (last?.id) emitRead(last.id);
	}, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const unsubTyping = on("typing", ({ userId }) => {
			setTypingUser(memberMap[userId] || null);
		});
		const unsubStop = on("stop_typing", () => setTypingUser(null));
		return () => {
			unsubTyping();
			unsubStop();
		};
	}, [on, memberMap]);

	useEffect(() => {
		return on("room_deleted", ({ roomId }) => {
			if (Number(roomId) === Number(groupId)) navigate("/dashboard");
		});
	}, [on, groupId, navigate]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [rawMessages, typingUser]);

	useEffect(() => {
		if (loading || !room || rawMessages.length === 0) return;
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
	}, [rawMessages, loading, room]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleSend = useCallback(
		(text, _file, reply) => {
			if (!text || !groupId) return;
			dispatch(
				addOptimisticMessage({
					roomId: Number(groupId),
					senderId: user?.id,
					body: text,
					replyToId: reply?.id ?? null,
				}),
			);
			sendMessage(text, reply?.id);
			setReplyTo(null);
		},
		[sendMessage, dispatch, groupId, user],
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
				await roomService.pinMessage(Number(groupId), msgId ?? 0);
				setPinnedMessage(msgId ? msg : null);
				toast.success(msgId ? "Pesan disematkan" : "Sematan dilepas");
			} catch {
				toast.error("Gagal menyematkan pesan");
			}
		},
		[groupId],
	);

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

	const groupedMessages = useMemo(() => {
		if (!room || loading) return [];
		const msgMap = Object.fromEntries(rawMessages.map((m) => [m.id, m]));
		const messages = rawMessages.map((m) => {
			let replyToRow = null;
			if (m.reply_to_id) {
				const parent = msgMap[m.reply_to_id] || replyCache[m.reply_to_id];
				const parentSenderId = parent?.sender_id ?? parent?.from;
				const parentName =
					memberMap[parentSenderId] || `User ${parentSenderId}`;
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
					memberMap[m.sender_id ?? m.from] || `User ${m.sender_id ?? m.from}`,
				text: m.body ?? m.text ?? "",
				timestamp:
					m.created_at ? new Date(m.created_at) : new Date(m.sent_at * 1000),
				read: true,
				replyTo: replyToRow,
				deleted: m.is_deleted,
				edited: !!m.edited_at,
			};
		});
		return groupMessagesWithDateDividers(messages);
	}, [room, loading, rawMessages, replyCache, memberMap]);

	const msgItems = useMemo(
		() => messageOnlyItems(groupedMessages),
		[groupedMessages],
	);

	const shouldShowAvatar = useMemo(
		() => createShouldShowAvatar(msgItems),
		[msgItems],
	);

	const groupForInfo = useMemo(
		() => ({
			...room,
			members: members.map((m) => ({
				id: m.id,
				name: m.username || m.email,
				role: m.role || "member",
			})),
		}),
		[room, members],
	);

	const scrollToPinnedMessage = useCallback(() => {
		const el = document.getElementById(`msg-${pinnedMessage?.id}`);
		el?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [pinnedMessage?.id]);

	const updateMembersFromGroupInfo = useCallback((newMembers) => {
		setMembers(
			newMembers.map((m) => ({
				id: m.id,
				username: m.name || m.username,
				email: m.email,
				role: m.role || "member",
			})),
		);
	}, []);

	return {
		loading,
		room,
		user,
		members,
		memberMap,
		showInfo,
		setShowInfo,
		showGallery,
		setShowGallery,
		pinnedMessage,
		replyTo,
		setReplyTo,
		bookmarkedIds,
		typingUser,
		isConnected,
		ongoingCalls,
		startCall,
		callHistory,
		messagesEndRef,
		groupedMessages,
		shouldShowAvatar,
		groupForInfo,
		handleSend,
		handleTyping,
		handleDelete,
		handlePin,
		handleBookmark,
		scrollToPinnedMessage,
		updateMembersFromGroupInfo,
	};
}
