import { useEffect, useCallback, useState, useRef, memo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
	LiveKitRoom,
	VideoTrack,
	RoomAudioRenderer,
	useTracks,
	useParticipants,
	useLocalParticipant,
	useIsSpeaking,
	isTrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useCall } from "../context/CallContext";
import {
	Phone,
	PhoneOff,
	Mic,
	MicOff,
	Video,
	VideoOff,
	Users,
} from "lucide-react";

// ── Memoized voice tile ───────────────────────────────────────────────────────
const VoiceTile = memo(({ participant }) => {
	const isSpeaking = useIsSpeaking(participant);
	return (
		<div className='aspect-video bg-[#3c4043] rounded-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden'>
			<div
				className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg transition-all ${
					isSpeaking ? "ring-2 ring-emerald-400 scale-105" : ""
				}`}
			>
				{(participant.name || participant.identity)?.[0]?.toUpperCase() ?? "?"}
			</div>
			<span className='text-white text-sm font-medium'>
				{participant.name || participant.identity}
			</span>
			{isSpeaking && (
				<div className='absolute bottom-3 left-3 flex gap-[2px] items-end h-3'>
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className='w-[3px] bg-emerald-400 rounded-sm animate-bounce'
							style={{
								height: `${4 + i * 3}px`,
								animationDelay: `${i * 0.1}s`,
							}}
						/>
					))}
				</div>
			)}
			<div className='absolute bottom-2 left-0 right-0 flex justify-center'>
				<span className='bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
					{participant.name || participant.identity}
				</span>
			</div>
		</div>
	);
});

// ── Memoized video tile ───────────────────────────────────────────────────────
const VideoTile = memo(({ track }) => {
	const p = track.participant;
	const isSpeaking = useIsSpeaking(p);
	// Direct property check — safe even when publication is undefined.
	// useTracks() re-renders the parent when mute state changes, so this stays fresh.
	const isCamOff = !track.publication || track.publication.isMuted;

	if (!p) return null;

	return (
		<div
			className={`relative rounded-xl overflow-hidden bg-[#3c4043] flex items-center justify-center transition-all ${
				isSpeaking ? "ring-2 ring-emerald-400" : ""
			}`}
		>
			{isCamOff ?
				<div className='w-full h-full flex items-center justify-center bg-[#3c4043]'>
					<div className='w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg'>
						{(p.name || p.identity)?.[0]?.toUpperCase() ?? "?"}
					</div>
				</div>
			:	<VideoTrack trackRef={track} className='w-full h-full object-cover' />}
			<div className='absolute bottom-2 left-2'>
				<span className='bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
					{p.name || p.identity}
				</span>
			</div>
		</div>
	);
});

// ── Voice layout ──────────────────────────────────────────────────────────────
const VoiceLayout = ({ onEndCall }) => {
	const participants = useParticipants();
	const { localParticipant } = useLocalParticipant();
	const [muted, setMuted] = useState(false);

	const toggleMic = useCallback(() => {
		localParticipant.setMicrophoneEnabled(muted);
		setMuted((m) => !m);
	}, [localParticipant, muted]);

	return (
		<div className='flex flex-col h-full bg-[#202124]'>
			<div className='flex-1 flex items-center justify-center p-6'>
				<div
					className='grid gap-3 w-full max-w-2xl'
					style={{
						gridTemplateColumns:
							participants.length === 1 ? "1fr"
							: participants.length <= 4 ? "repeat(2, 1fr)"
							: "repeat(3, 1fr)",
					}}
				>
					{participants.map((p) => (
						<VoiceTile key={p.identity} participant={p} />
					))}
				</div>
			</div>

			<RoomAudioRenderer />

			<div className='flex items-center justify-center gap-3 border-t border-white/10 bg-[#202124] px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-4 sm:py-5'>
				<button
					type='button'
					onClick={toggleMic}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124] ${
						muted ?
							"bg-red-500 hover:bg-red-600"
						:	"bg-[#3c4043] hover:bg-[#4a4d51]"
					}`}
					aria-label={muted ? "Nyalakan mikrofon" : "Mute mikrofon"}
					title={muted ? "Unmute" : "Mute"}
				>
					{muted ?
						<MicOff className='w-5 h-5 text-white' />
					:	<Mic className='w-5 h-5 text-white' />}
				</button>
				<button
					type='button'
					onClick={onEndCall}
					className='w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124]'
					aria-label='Tinggalkan panggilan'
					title='Tinggalkan'
				>
					<PhoneOff className='w-6 h-6 text-white' />
				</button>
			</div>
		</div>
	);
};

// ── Video layout ──────────────────────────────────────────────────────────────
const VideoLayout = ({ onEndCall }) => {
	const { localParticipant } = useLocalParticipant();
	const allTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
	const [muted, setMuted] = useState(false);
	const [videoOff, setVideoOff] = useState(false);

	const toggleMic = useCallback(() => {
		localParticipant.setMicrophoneEnabled(muted);
		setMuted((m) => !m);
	}, [localParticipant, muted]);

	const toggleCamera = useCallback(() => {
		localParticipant.setCameraEnabled(videoOff);
		setVideoOff((v) => !v);
	}, [localParticipant, videoOff]);

	// Only real track references (not placeholders) — guarantees publication exists
	const remoteTracks = allTracks.filter(
		(t) => isTrackReference(t) && !t.participant.isLocal,
	);
	const localTrack = allTracks.find(
		(t) => isTrackReference(t) && t.participant.isLocal,
	);

	return (
		<div className='flex flex-col h-full bg-[#202124]'>
			<div className='flex-1 relative p-3 overflow-hidden'>
				{remoteTracks.length > 0 ?
					<div
						className='h-full grid gap-2'
						style={{
							gridTemplateColumns:
								remoteTracks.length === 1 ? "1fr" : "repeat(2, 1fr)",
						}}
					>
						{remoteTracks.map((t) => (
							<VideoTile key={t.participant.identity} track={t} />
						))}
					</div>
				:	<div className='h-full flex items-center justify-center'>
						<div className='flex flex-col items-center gap-3 text-white/50'>
							<Users className='w-12 h-12' />
							<p className='text-sm'>Menunggu peserta lain…</p>
						</div>
					</div>
				}

				{/* Local PiP */}
				<div className='absolute bottom-3 right-3 w-32 h-24 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-[#3c4043]'>
					{localTrack && !videoOff ?
						<VideoTrack
							trackRef={localTrack}
							className='w-full h-full object-cover'
						/>
					:	<div className='w-full h-full flex items-center justify-center'>
							<div className='w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm'>
								{(localParticipant.name ||
									localParticipant.identity)?.[0]?.toUpperCase() ?? "?"}
							</div>
						</div>
					}
					<div className='absolute bottom-1 left-1 right-1 text-center'>
						<span className='text-white text-[10px] bg-black/50 px-1 rounded'>
							{localParticipant.name || "Kamu"}
						</span>
					</div>
				</div>
			</div>

			<RoomAudioRenderer />

			<div className='flex items-center justify-center gap-3 border-t border-white/10 bg-[#202124] px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-4 sm:py-5'>
				<button
					type='button'
					onClick={toggleMic}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124] ${
						muted ?
							"bg-red-500 hover:bg-red-600"
						:	"bg-[#3c4043] hover:bg-[#4a4d51]"
					}`}
					aria-label={muted ? "Nyalakan mikrofon" : "Mute mikrofon"}
					title={muted ? "Unmute" : "Mute"}
				>
					{muted ?
						<MicOff className='w-5 h-5 text-white' />
					:	<Mic className='w-5 h-5 text-white' />}
				</button>
				<button
					type='button'
					onClick={toggleCamera}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124] ${
						videoOff ?
							"bg-red-500 hover:bg-red-600"
						:	"bg-[#3c4043] hover:bg-[#4a4d51]"
					}`}
					aria-label={videoOff ? "Nyalakan kamera" : "Matikan kamera"}
					title={videoOff ? "Nyalakan Kamera" : "Matikan Kamera"}
				>
					{videoOff ?
						<VideoOff className='w-5 h-5 text-white' />
					:	<Video className='w-5 h-5 text-white' />}
				</button>
				<button
					type='button'
					onClick={onEndCall}
					className='w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124]'
					aria-label='Tinggalkan panggilan'
					title='Tinggalkan'
				>
					<PhoneOff className='w-6 h-6 text-white' />
				</button>
			</div>
		</div>
	);
};

// ── CallPage ──────────────────────────────────────────────────────────────────
const CallPage = () => {
	const { roomId } = useParams();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { activeCall, endCall } = useCall();

	const kind = searchParams.get("kind") || "voice";
	const isVideo = kind === "video";

	// Snapshot call data once on mount so LiveKitRoom stays stable even when
	// activeCall changes in context mid-call.
	const [callData] = useState(() => activeCall);

	// Return path is stored inside callData so it can't drift after mount.
	const returnPath = callData?.returnPath || "/dashboard";

	// Guard: prevent double navigation from both button handler and onDisconnected.
	const leavingRef = useRef(false);

	// If somehow landed here with no call data, go back immediately.
	useEffect(() => {
		if (!callData) navigate(returnPath, { replace: true });
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// User pressed the leave button — notify everyone, clear state, navigate away.
	const handleLeaveBtn = useCallback(() => {
		if (leavingRef.current) return;
		leavingRef.current = true;
		endCall(Number(roomId)); // clears local state + fires POST /call/end
		navigate(returnPath, { replace: true });
	}, [endCall, roomId, navigate, returnPath]);

	// LiveKit fired onDisconnected (network drop or normal disconnect after leave).
	// State is already handled by either handleLeaveBtn or the WS call_ended event.
	// Just navigate away once.
	const handleLKDisconnect = useCallback(() => {
		if (leavingRef.current) return;
		leavingRef.current = true;
		navigate(returnPath, { replace: true });
	}, [navigate, returnPath]);

	if (!callData) return null;

	return (
		<div className='flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#202124]'>
			<div className='flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#202124] px-4 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-3'>
				<div className='flex items-center gap-2 text-white'>
					{isVideo ?
						<Video className='w-4 h-4 text-emerald-400' />
					:	<Phone className='w-4 h-4 text-emerald-400' />}
					<span className='text-sm font-medium'>
						{isVideo ? "Video Call" : "Voice Call"}
					</span>
				</div>
				<div className='flex items-center gap-1.5'>
					<div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
					<span className='text-emerald-400 text-xs'>Live</span>
				</div>
			</div>

			{/* LiveKitRoom uses a stable snapshot — never re-connects mid-call */}
			<LiveKitRoom
				serverUrl={callData.liveKitUrl}
				token={callData.token}
				connect
				video={isVideo}
				audio
				onDisconnected={handleLKDisconnect}
				className='flex-1 flex flex-col overflow-hidden'
			>
				{isVideo ?
					<VideoLayout onEndCall={handleLeaveBtn} />
				:	<VoiceLayout onEndCall={handleLeaveBtn} />}
			</LiveKitRoom>
		</div>
	);
};

export default CallPage;
