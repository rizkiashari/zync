import { useState, useEffect, useCallback } from "react";
import { pollService } from "../services/pollService";

/**
 * Manages polls for a room: loading, WS events, creating/updating.
 * @param {number|string} roomId
 * @param {function} onWsEvent - the `on` function from useDirectChatRoom or useGroupRoom
 */
export function useChatPolls(roomId, onWsEvent) {
	const [polls, setPolls] = useState([]);

	// Load polls on mount
	useEffect(() => {
		if (!roomId) return;
		let cancelled = false;
		pollService
			.list(roomId)
			.then((res) => {
				if (cancelled) return;
				const list = res.data?.data?.polls ?? res.data?.polls ?? [];
				setPolls(list);
			})
			.catch(() => {});
		return () => { cancelled = true; };
	}, [roomId]);

	// Listen for poll WebSocket events
	useEffect(() => {
		if (!onWsEvent) return;
		const unsubCreated = onWsEvent("poll_created", (ev) => {
			const poll = ev.poll ?? ev;
			setPolls((prev) => {
				if (prev.some((p) => p.id === poll.id)) return prev;
				return [poll, ...prev];
			});
		});
		const unsubUpdated = onWsEvent("poll_updated", (ev) => {
			const poll = ev.poll ?? ev;
			if (!poll?.id) return;
			setPolls((prev) => prev.map((p) => (p.id === poll.id ? poll : p)));
		});
		const unsubDeleted = onWsEvent("poll_deleted", (ev) => {
			const id = ev.poll_id ?? ev.id;
			setPolls((prev) => prev.filter((p) => p.id !== id));
		});
		return () => {
			unsubCreated?.();
			unsubUpdated?.();
			unsubDeleted?.();
		};
	}, [onWsEvent]);

	const addPoll = useCallback((poll) => {
		setPolls((prev) => {
			if (prev.some((p) => p.id === poll.id)) return prev;
			return [poll, ...prev];
		});
	}, []);

	return { polls, addPoll };
}
