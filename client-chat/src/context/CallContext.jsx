import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "./SocketContext";
import { callService } from "../services/callService";
import { requestMediaPermissions } from "../lib/platform";
import toast from "react-hot-toast";

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
	const { on } = useSocket();
	const navigate = useNavigate();
	const location = useLocation();
	const [incomingCall, setIncomingCall] = useState(null); // { roomId, from, kind }
	const [activeCall, setActiveCall] = useState(null); // { roomId, kind, token, liveKitUrl, liveKitRoom, returnPath }
	// roomId → kind for ongoing calls this client knows about (from WS events)
	const [ongoingCalls, setOngoingCalls] = useState({}); // { [roomId]: kind }
	// Global call history: { [roomId]: CallEvent[] } — persists across navigation
	const [callHistory, setCallHistory] = useState({}); // { [roomId]: [{id, callType, kind, from, timestamp}] }

	// ── Listen for incoming call events via WS ──────────────────────────────
	useEffect(() => {
		const unsubStart = on("call_started", (payload) => {
			const roomId = payload.room_id;
			const kind = payload.kind || "voice";
			// Track ongoing call regardless of own state
			setOngoingCalls((prev) => ({ ...prev, [roomId]: kind }));
			// Record in global history
			setCallHistory((prev) => ({
				...prev,
				[roomId]: [
					...(prev[roomId] || []),
					{ id: `cs_${Date.now()}`, callType: "call_started", kind, from: payload.from, timestamp: new Date() },
				],
			}));
			// Show incoming modal only if not already in a call
			if (activeCall) return;
			setIncomingCall({ roomId, from: payload.from, kind });
		});

		const unsubEnd = on("call_ended", (payload) => {
			const roomId = payload.room_id;
			// Clear the "join ongoing call" banner
			setOngoingCalls((prev) => {
				const next = { ...prev };
				delete next[roomId];
				return next;
			});
			// Record in global history — infer kind from last call_started event
			setCallHistory((prev) => {
				const prevEvents = prev[roomId] || [];
				const lastStart = [...prevEvents].reverse().find((e) => e.callType === "call_started");
				return {
					...prev,
					[roomId]: [
						...prevEvents,
						{ id: `ce_${Date.now()}`, callType: "call_ended", kind: lastStart?.kind || "voice", from: null, timestamp: new Date() },
					],
				};
			});
			// Dismiss pending incoming call notification
			setIncomingCall((prev) => prev?.roomId === roomId ? null : prev);
			// Do NOT clear activeCall here — each participant decides when to leave.
			// Only the person who clicked the leave button clears their own activeCall.
		});

		// When a room is deleted, clean up any lingering call state for it
		const unsubDeleted = on("room_deleted", (payload) => {
			const roomId = payload.roomId ?? payload.room_id;
			if (!roomId) return;
			setOngoingCalls((prev) => {
				const next = { ...prev };
				delete next[roomId];
				return next;
			});
			setCallHistory((prev) => {
				const next = { ...prev };
				delete next[roomId];
				return next;
			});
			setIncomingCall((prev) => prev?.roomId === roomId ? null : prev);
		});

		return () => {
			unsubStart();
			unsubEnd();
			unsubDeleted();
		};
	}, [on, activeCall]);

	// ── Initiate an outgoing call ───────────────────────────────────────────
	const startCall = useCallback(
		async (roomId, kind = "voice") => {
			try {
				await requestMediaPermissions(kind);
			} catch (permErr) {
				toast.error(permErr.message);
				return;
			}
			try {
				await callService.startCall(roomId, kind);
				const res = await callService.getToken(roomId);
				const { token, livekit_url, livekit_room } = res.data.data;
				setActiveCall({
					roomId,
					kind,
					token,
					liveKitUrl: livekit_url,
					liveKitRoom: livekit_room,
					returnPath: location.pathname,
				});
				navigate(`/call/${roomId}?kind=${kind}`);
			} catch {
				toast.error("Gagal memulai panggilan");
			}
		},
		[navigate, location],
	);

	// ── Accept an incoming call ─────────────────────────────────────────────
	const acceptCall = useCallback(async () => {
		if (!incomingCall) return;
		const { roomId, kind } = incomingCall;
		try {
			await requestMediaPermissions(kind);
		} catch (permErr) {
			toast.error(permErr.message);
			return;
		}
		setIncomingCall(null);
		try {
			const res = await callService.getToken(roomId);
			const { token, livekit_url, livekit_room } = res.data.data;
			setActiveCall({
				roomId,
				kind,
				token,
				liveKitUrl: livekit_url,
				liveKitRoom: livekit_room,
				returnPath: location.pathname,
			});
			navigate(`/call/${roomId}?kind=${kind}`);
		} catch {
			toast.error("Gagal bergabung ke panggilan");
		}
	}, [incomingCall, navigate, location]);

	// ── Decline an incoming call ────────────────────────────────────────────
	const declineCall = useCallback(() => {
		setIncomingCall(null);
	}, []);

	// ── End / leave an active call ──────────────────────────────────────────
	const endCall = useCallback(
		(roomId) => {
			const rid = roomId ?? activeCall?.roomId;
			// Fire-and-forget – clear local state immediately so the UI responds
			// without waiting for the round-trip. The backend will broadcast
			// call_ended which clears state for everyone else via the WS handler.
			setActiveCall(null);
			setIncomingCall(null);
			if (rid) {
				callService.endCall(rid).catch(() => {/* ignore */});
			}
		},
		[activeCall],
	);

	return (
		<CallContext.Provider
			value={{
				incomingCall,
				activeCall,
				ongoingCalls,
				callHistory,
				startCall,
				acceptCall,
				declineCall,
				endCall,
			}}
		>
			{children}
		</CallContext.Provider>
	);
};

export const useCall = () => {
	const ctx = useContext(CallContext);
	if (!ctx) throw new Error("useCall must be used within CallProvider");
	return ctx;
};
