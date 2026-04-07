import {
	createContext,
	useContext,
	useRef,
	useState,
	useCallback,
	useEffect,
} from "react";
import { usePushNotification } from "../hooks/usePushNotification";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { WS_BASE } from "../lib/api";
import {
	receiveWsMessage,
	updateRoomLastMessage,
	upsertRoom,
	removeRoom,
} from "../store/roomsSlice";
import { receiveWsMessageInMessages } from "../store/messagesSlice";
import { fetchNotifications } from "../store/notificationsSlice";

// Helper to update onlineUsers array immutably
const applyPresence = (prev, userId, online) => {
	if (online) return [...new Set([...prev, userId])];
	return prev.filter((id) => id !== userId);
};

const SocketContext = createContext(null);

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const SocketProvider = ({ children }) => {
	const reduxDispatch = useDispatch();
	const user = useSelector((s) => s.auth.user);

	const wsRef = useRef(null);
	const notifyWsRef = useRef(null);
	const notifyReconnectTimerRef = useRef(null);
	const currentRoomRef = useRef(null);
	const reconnectTimerRef = useRef(null);
	const reconnectAttemptsRef = useRef(0);
	const listenersRef = useRef({});
	const [isConnected, setIsConnected] = useState(false);
	const [isNotifyConnected, setIsNotifyConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState([]);
	// userPresence: { [userId]: { online, lastSeenAt: Date|null, statusMessage: string } }
	const [userPresence, setUserPresence] = useState({});
	usePushNotification(user);

	const emitEvent = useCallback((event, data) => {
		listenersRef.current[event]?.forEach((cb) => cb(data));
	}, []);

	const on = useCallback((event, callback) => {
		if (!listenersRef.current[event]) listenersRef.current[event] = new Set();
		listenersRef.current[event].add(callback);
		return () => listenersRef.current[event]?.delete(callback);
	}, []);

	const off = useCallback((event, callback) => {
		listenersRef.current[event]?.delete(callback);
	}, []);

	const emit = useCallback((payload) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(payload));
		}
	}, []);

	const connectToRoom = useCallback(
		(roomId) => {
			if (!roomId || !user) return;
			if (
				currentRoomRef.current === roomId &&
				wsRef.current?.readyState === WebSocket.OPEN
			)
				return;

			clearTimeout(reconnectTimerRef.current);
			if (wsRef.current) {
				wsRef.current.onclose = null;
				wsRef.current.close();
				wsRef.current = null;
			}

			currentRoomRef.current = roomId;
			reconnectAttemptsRef.current = 0;

			const doConnect = () => {
				const token = localStorage.getItem("access_token");
				if (!token) return;

				const url = `${WS_BASE}/ws?room=${roomId}&token=${token}`;
				const ws = new WebSocket(url);
				wsRef.current = ws;

				ws.onopen = () => {
					setIsConnected(true);
					reconnectAttemptsRef.current = 0;
				};

				ws.onclose = () => {
					setIsConnected(false);
					wsRef.current = null;
					if (
						currentRoomRef.current === roomId &&
						reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
					) {
						reconnectAttemptsRef.current += 1;
						reconnectTimerRef.current = setTimeout(doConnect, RECONNECT_DELAY);
					}
				};

				ws.onerror = () => setIsConnected(false);

				ws.onmessage = (event) => {
					// Server may batch multiple JSON objects in one frame separated by '\n'
					const parts = String(event.data).split("\n").filter(Boolean);
					for (const part of parts) {
						try {
							const msg = JSON.parse(part);
							switch (msg.type) {
								case "chat": {
									reduxDispatch(receiveWsMessageInMessages(msg));
									// Don't increment badge if: own message OR actively viewing that room
									const isOwn = Number(msg.from) === Number(user?.id);
									const isActiveRoom =
										Number(msg.room) === currentRoomRef.current;
									if (isOwn || isActiveRoom) {
										reduxDispatch(updateRoomLastMessage(msg));
									} else {
										reduxDispatch(receiveWsMessage(msg));
									}
									emitEvent("chat", msg);
									break;
								}
								case "typing":
									emitEvent("typing", {
										userId: msg.user_id,
										roomId: msg.room,
									});
									break;
								case "stop_typing":
									emitEvent("stop_typing", {
										userId: msg.user_id,
										roomId: msg.room,
									});
									break;
								case "presence":
									setOnlineUsers((prev) =>
										applyPresence(prev, msg.user_id, msg.online),
									);
									setUserPresence((prev) => ({
										...prev,
										[msg.user_id]: {
											online: msg.online,
											lastSeenAt: msg.online
												? null
												: msg.last_seen_at
												? new Date(msg.last_seen_at * 1000)
												: new Date(),
											statusMessage:
												msg.status_message ||
												prev[msg.user_id]?.statusMessage ||
												"",
										},
									}));
									emitEvent("presence", msg);
									break;
								case "read":
									emitEvent("read", msg);
									break;
								default:
									emitEvent(msg.type, msg);
							}
						} catch {
							/* ignore malformed frame */
						}
					}
				};
			};

			doConnect();
		},
		[user, emitEvent, reduxDispatch],
	);

	const disconnectRoom = useCallback(() => {
		clearTimeout(reconnectTimerRef.current);
		if (wsRef.current) {
			wsRef.current.onclose = null;
			wsRef.current.close();
			wsRef.current = null;
		}
		currentRoomRef.current = null;
		setIsConnected(false);
	}, []);

	// Global notify WS — persists while logged in; receives cross-room chat notifications
	useEffect(() => {
		if (!user) {
			clearTimeout(notifyReconnectTimerRef.current);
			if (notifyWsRef.current) {
				notifyWsRef.current.onclose = null;
				notifyWsRef.current.close();
				notifyWsRef.current = null;
			}
			return;
		}

		const connectNotify = () => {
			const token = localStorage.getItem("access_token");
			if (!token) return;
			const ws = new WebSocket(`${WS_BASE}/ws/notify?token=${token}`);
			notifyWsRef.current = ws;

			ws.onopen = () => {
				setIsNotifyConnected(true);
			};

			ws.onmessage = (event) => {
				const parts = String(event.data).split("\n").filter(Boolean);
				for (const part of parts) {
					try {
						const msg = JSON.parse(part);
						if (msg.type === "chat") {
							// Only increment badge if message is NOT from the active room
							const isActiveRoom = Number(msg.room) === currentRoomRef.current;
							const isOwn = Number(msg.from) === Number(user?.id);
							if (!isActiveRoom && !isOwn) {
								reduxDispatch(receiveWsMessage(msg));
							}
						} else if (msg.type === "room_added" && msg.room) {
							reduxDispatch(upsertRoom(msg.room));
						} else if (msg.type === "room_deleted") {
							reduxDispatch(removeRoom(msg.room_id));
							emitEvent("room_deleted", { roomId: msg.room_id });
						} else if (
							msg.type === "call_started" ||
							msg.type === "call_ended"
						) {
							emitEvent(msg.type, msg);
						} else if (msg.type === "task_reminder") {
							toast(`⏰ Deadline: "${msg.title}" jatuh tempo dalam 24 jam`, {
								duration: 6000,
								icon: "📋",
							});
						} else if (msg.type === "task_assigned") {
							const t = msg.title ? `"${msg.title}"` : "sebuah task";
							toast(msg.body || `Kamu ditugaskan pada ${t}`, {
								duration: 5000,
								icon: "📋",
							});
							reduxDispatch(fetchNotifications());
						} else if (msg.type === "notification_refresh") {
							if (msg.body) {
								toast(msg.body, { duration: 5000, icon: "👤" });
							}
							reduxDispatch(fetchNotifications());
						} else if (msg.type === "workspace_members_refresh") {
							emitEvent("workspace_members_refresh", msg);
						} else if (msg.type === "workspace_subscription_refresh") {
							emitEvent("workspace_subscription_refresh", msg);
						} else if (msg.type === "removed_from_workspace") {
							emitEvent("removed_from_workspace", msg);
						} else if (msg.type === "presence") {
							setOnlineUsers((prev) =>
								applyPresence(prev, msg.user_id, msg.online),
							);
							setUserPresence((prev) => ({
								...prev,
								[msg.user_id]: {
									online: msg.online,
									lastSeenAt: msg.online
										? null
										: msg.last_seen_at
										? new Date(msg.last_seen_at * 1000)
										: new Date(),
									statusMessage:
										msg.status_message ||
										prev[msg.user_id]?.statusMessage ||
										"",
								},
							}));
							emitEvent("presence", msg);
						}
					} catch {
						/* ignore */
					}
				}
			};

			ws.onclose = () => {
				setIsNotifyConnected(false);
				notifyWsRef.current = null;
				// Reconnect after 5s
				notifyReconnectTimerRef.current = setTimeout(connectNotify, 5000);
			};

			ws.onerror = () => {
				ws.close();
			};
		};

		connectNotify();

		return () => {
			clearTimeout(notifyReconnectTimerRef.current);
			if (notifyWsRef.current) {
				notifyWsRef.current.onclose = null;
				notifyWsRef.current.close();
				notifyWsRef.current = null;
			}
		};
	}, [user, reduxDispatch, emitEvent]);

	// Close room socket when user logs out (disconnectRoom updates connection state).
	useEffect(() => {
		if (!user) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- logout: close room WS and sync disconnected UI
			disconnectRoom();
		}
	}, [user, disconnectRoom]);

	// Auto-offline after 20 min of user inactivity: close both WS connections.
	// They auto-reconnect when the user interacts again.
	const idleTimerRef = useRef(null);
	const isIdleRef = useRef(false);

	useEffect(() => {
		if (!user) return;
		const IDLE_MS = 20 * 60 * 1000; // 20 minutes

		const goOffline = () => {
			if (isIdleRef.current) return;
			isIdleRef.current = true;
			// Close room WS — backend marks user offline on disconnect
			if (wsRef.current) {
				wsRef.current.onclose = null;
				wsRef.current.close();
				wsRef.current = null;
				setIsConnected(false);
			}
			// Close notify WS too
			clearTimeout(notifyReconnectTimerRef.current);
			if (notifyWsRef.current) {
				notifyWsRef.current.onclose = null;
				notifyWsRef.current.close();
				notifyWsRef.current = null;
			}
		};

		const onActivity = () => {
			clearTimeout(idleTimerRef.current);
			if (isIdleRef.current) {
				// Reconnect notify WS on return from idle
				isIdleRef.current = false;
				const token = localStorage.getItem("access_token");
				if (token && !notifyWsRef.current) {
					const notifyUrl = `${WS_BASE}/ws/notify?token=${token}`;
					const ws = new WebSocket(notifyUrl);
					notifyWsRef.current = ws;
					ws.onclose = () => {
						notifyWsRef.current = null;
						if (!isIdleRef.current)
							notifyReconnectTimerRef.current = setTimeout(() => {
								const t = localStorage.getItem("access_token");
								if (t) {
									const w2 = new WebSocket(`${WS_BASE}/ws/notify?token=${t}`);
									notifyWsRef.current = w2;
								}
							}, 3000);
					};
					ws.onerror = () => ws.close();
				}
				// Room WS reconnects automatically when user navigates back to a room
			}
			idleTimerRef.current = setTimeout(goOffline, IDLE_MS);
		};

		const EVENTS = [
			"mousemove",
			"keydown",
			"mousedown",
			"touchstart",
			"scroll",
		];
		EVENTS.forEach((ev) =>
			window.addEventListener(ev, onActivity, { passive: true }),
		);
		idleTimerRef.current = setTimeout(goOffline, IDLE_MS);

		return () => {
			clearTimeout(idleTimerRef.current);
			EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
		};
	}, [user]);

	useEffect(() => {
		return () => {
			clearTimeout(reconnectTimerRef.current);
			if (wsRef.current) {
				wsRef.current.onclose = null;
				wsRef.current.close();
			}
		};
	}, []);

	const sendMessage = useCallback(
		(text, replyToId) => {
			const payload = { type: "chat", text };
			if (replyToId) payload.reply_to_id = replyToId;
			emit(payload);
		},
		[emit],
	);

	const emitTyping = useCallback(() => emit({ type: "typing" }), [emit]);
	const emitStopTyping = useCallback(
		() => emit({ type: "stop_typing" }),
		[emit],
	);
	const emitRead = useCallback(
		(msgId) => emit({ type: "read", msg_id: msgId }),
		[emit],
	);

	return (
		<SocketContext.Provider
			value={{
				isConnected,
				isNotifyConnected,
				onlineUsers,
				userPresence,
				on,
				off,
				connectToRoom,
				disconnectRoom,
				sendMessage,
				emitTyping,
				emitStopTyping,
				emitRead,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => {
	const ctx = useContext(SocketContext);
	if (!ctx) throw new Error("useSocket must be used within SocketProvider");
	return ctx;
};

export default SocketContext;
