/**
 * CallEventOverlay
 * Renders floating sticker + sawer animations inside the video call.
 * Events come from useCallEvents hook (LiveKit data channel).
 */

// ── Overlay renderer ──────────────────────────────────────────────────────────
export default function CallEventOverlay({ events }) {
	if (!events.length) return null;

	return (
		<div className='pointer-events-none absolute inset-0 overflow-hidden'>
			{events.map((ev) =>
				ev.type === "sticker" ? (
					<StickerEvent key={ev.id} event={ev} />
				) : (
					<SawerEvent key={ev.id} event={ev} />
				),
			)}
		</div>
	);
}

function StickerEvent({ event }) {
	// x is always provided by sender (StickerPanel sets x before calling sendEvent)
	const left = event.x ?? 30;
	return (
		<div
			className='animate-float-up absolute bottom-16 text-5xl select-none'
			style={{ left: `${left}%` }}
		>
			{event.stickerId}
		</div>
	);
}

function SawerEvent({ event }) {
	return (
		<div className='animate-sawer-in absolute bottom-20 left-1/2 -translate-x-1/2'>
			<div className='flex items-center gap-2 rounded-full bg-yellow-400/90 px-4 py-2 shadow-lg'>
				<span className='text-xl'>🪙</span>
				<div className='text-sm font-bold text-yellow-900'>
					<span className='text-yellow-700'>{event.from}</span>
					{" sawer "}
					<span className='text-base'>
						{event.amount?.toLocaleString()}
					</span>
					{" koin"}
					{event.message && (
						<span className='ml-1 font-normal'>
							— {event.message}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
