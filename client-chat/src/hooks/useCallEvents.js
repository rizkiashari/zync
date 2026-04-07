/**
 * useCallEvents — LiveKit data-channel hook for sticker & sawer events.
 * Must be used inside a <LiveKitRoom> component tree.
 */
import { useEffect, useState, useCallback } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

export function useCallEvents() {
	const room = useRoomContext();
	const { localParticipant } = useLocalParticipant();
	const [events, setEvents] = useState([]);

	const pushEvent = useCallback((ev) => {
		const id = `${Date.now()}_${Math.random()}`;
		setEvents((prev) => [...prev, { ...ev, id }]);
		setTimeout(
			() => setEvents((prev) => prev.filter((e) => e.id !== id)),
			4500,
		);
	}, []);

	// Receive events from remote participants
	useEffect(() => {
		const handler = (data, participant) => {
			try {
				const msg = JSON.parse(new TextDecoder().decode(data));
				if (msg.type === "sticker" || msg.type === "sawer") {
					pushEvent({
						...msg,
						from:
							participant?.name ||
							participant?.identity ||
							"Seseorang",
					});
				}
			} catch {
				// ignore malformed data
			}
		};
		room.on(RoomEvent.DataReceived, handler);
		return () => room.off(RoomEvent.DataReceived, handler);
	}, [room, pushEvent]);

	// Send event and show locally immediately
	const sendEvent = useCallback(
		(type, payload) => {
			const from =
				localParticipant.name ||
				localParticipant.identity ||
				"Kamu";
			const msg = { type, from, ...payload };
			try {
				const encoded = new TextEncoder().encode(JSON.stringify(msg));
				localParticipant.publishData(encoded, { reliable: true });
			} catch {
				// data channel unavailable — still show locally
			}
			pushEvent(msg);
		},
		[localParticipant, pushEvent],
	);

	return { events, sendEvent };
}
