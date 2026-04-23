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
	RotateCcw,
	Coins,
	SmilePlus,
	Monitor,
	MonitorOff as MonitorStopIcon,
	Hand,
	MessageSquare,
} from "lucide-react";
import { useCallEvents } from "../hooks/useCallEvents";
import CallEventOverlay from "../components/call/CallEventOverlay";
import SawerPanel from "../components/call/SawerPanel";
import StickerPanel from "../components/call/StickerPanel";
import toast from "react-hot-toast";
import ParticipantList from "../components/call/ParticipantList";
import CallChat from "../components/call/CallChat";

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
	const isCamOff = !track.publication || track.publication.isMuted;

	if (!p) return null;

	return (
		<div
			className={`relative rounded-xl overflow-hidden bg-black flex items-center justify-center transition-all ${
				isSpeaking ? "ring-2 ring-emerald-400" : ""
			}`}
		>
			{/* Feature 1: black screen when cam off */}
			{isCamOff ? (
				<div className='w-full h-full flex items-center justify-center bg-black' />
			) : (
				<VideoTrack trackRef={track} className='w-full h-full object-cover' />
			)}
			<div className='absolute bottom-2 left-2'>
				<span className='bg-black/60 text-white text-xs px-2 py-0.5 rounded-full'>
					{p.name || p.identity}
					{track.source === Track.Source.ScreenShare ? " · Layar" : ""}
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
	const [showParticipants, setShowParticipants] = useState(false);
	const [showChat, setShowChat] = useState(false);
	const [handRaised, setHandRaised] = useState(false);

	const { events, sendEvent, raisedHands, chatMessages } = useCallEvents();

	const toggleMic = useCallback(() => {
		localParticipant.setMicrophoneEnabled(muted);
		setMuted((m) => !m);
	}, [localParticipant, muted]);

	const handleToggleHand = useCallback(() => {
		const nextRaised = !handRaised;
		setHandRaised(nextRaised);
		sendEvent(nextRaised ? "raise_hand" : "lower_hand", {});
	}, [handRaised, sendEvent]);

	const handleSendChat = useCallback(
		(text) => {
			sendEvent("chat", { text });
		},
		[sendEvent],
	);

	return (
		<div className='flex flex-col h-full bg-[#202124]'>
			<div className='flex-1 relative flex items-center justify-center p-6'>
				<div
					className='grid gap-3 w-full max-w-2xl'
					style={{
						gridTemplateColumns:
							participants.length === 1
								? "1fr"
								: participants.length <= 4
								? "repeat(2, 1fr)"
								: "repeat(3, 1fr)",
					}}
				>
					{participants.map((p) => (
						<VoiceTile key={p.identity} participant={p} />
					))}
				</div>

				<CallEventOverlay events={events} />

				{showParticipants && (
					<ParticipantList
						raisedHands={raisedHands}
						onClose={() => setShowParticipants(false)}
					/>
				)}

				{showChat && (
					<CallChat
						messages={chatMessages}
						onSend={handleSendChat}
						onClose={() => setShowChat(false)}
					/>
				)}
			</div>
			<RoomAudioRenderer />
			<div className='flex items-center justify-center gap-3 border-t border-white/10 bg-[#202124] px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-4 sm:py-5 flex-wrap'>
				<CtrlBtn
					active={muted}
					onClick={toggleMic}
					label={muted ? "Nyalakan mikrofon" : "Mute mikrofon"}
				>
					{muted ? (
						<MicOff className='w-5 h-5 text-white' />
					) : (
						<Mic className='w-5 h-5 text-white' />
					)}
				</CtrlBtn>

				{/* Raise hand */}
				<CtrlBtn
					active={handRaised}
					onClick={handleToggleHand}
					label={handRaised ? "Turunkan tangan" : "Angkat tangan"}
				>
					<Hand className={`w-5 h-5 ${handRaised ? "text-yellow-300" : "text-white"}`} />
				</CtrlBtn>

				{/* Participant list */}
				<CtrlBtn
					active={showParticipants}
					onClick={() => {
						setShowParticipants((v) => !v);
						setShowChat(false);
					}}
					label="Daftar peserta"
				>
					<Users className="w-5 h-5 text-white" />
				</CtrlBtn>

				{/* In-call chat */}
				<CtrlBtn
					active={showChat}
					onClick={() => {
						setShowChat((v) => !v);
						setShowParticipants(false);
					}}
					label="Chat"
				>
					<MessageSquare className="w-5 h-5 text-white" />
				</CtrlBtn>

				<EndBtn onClick={onEndCall} />
			</div>
		</div>
	);
};

// ── Video layout ──────────────────────────────────────────────────────────────
const VideoLayout = ({ onEndCall, callData }) => {
	const { localParticipant } = useLocalParticipant();
	const cameraTracks = useTracks([Track.Source.Camera], {
		onlySubscribed: false,
	});
	const screenTracks = useTracks([Track.Source.ScreenShare], {
		onlySubscribed: false,
	});
	const [muted, setMuted] = useState(false);
	const [videoOff, setVideoOff] = useState(false);
	const [facingMode, setFacingMode] = useState("user"); // Feature 2
	const [showSawer, setShowSawer] = useState(false); // Feature 3
	const [showSticker, setShowSticker] = useState(false); // Feature 4+5
	const [showParticipants, setShowParticipants] = useState(false);
	const [showChat, setShowChat] = useState(false);
	const [handRaised, setHandRaised] = useState(false);

	// Feature 3+4 — data channel events
	const { events, sendEvent, raisedHands, chatMessages } = useCallEvents();

	const remoteCameraTracks = cameraTracks.filter(
		(t) => isTrackReference(t) && !t.participant.isLocal,
	);
	const remoteScreenTracks = screenTracks.filter(
		(t) => isTrackReference(t) && !t.participant.isLocal,
	);
	const localTrack = cameraTracks.find(
		(t) => isTrackReference(t) && t.participant.isLocal,
	);
	// Derive from live track list — updates automatically when the browser/OS stops sharing
	const sharingScreen = screenTracks.some(
		(t) => isTrackReference(t) && t.participant.isLocal,
	);

	const toggleMic = useCallback(() => {
		localParticipant.setMicrophoneEnabled(muted);
		setMuted((m) => !m);
	}, [localParticipant, muted]);

	const toggleCamera = useCallback(() => {
		localParticipant.setCameraEnabled(videoOff);
		setVideoOff((v) => !v);
	}, [localParticipant, videoOff]);

	// Feature 2: flip between front and back camera
	const handleFlipCamera = useCallback(async () => {
		const next = facingMode === "user" ? "environment" : "user";
		try {
			await localParticipant.setCameraEnabled(true, { facingMode: next });
			setFacingMode(next);
		} catch {
			toast.error("Gagal mengganti kamera");
		}
	}, [localParticipant, facingMode]);

	// Feature 3: send sawer via data channel
	const handleSendSawer = useCallback(
		({ amount, message }) => {
			sendEvent("sawer", { amount, message });
		},
		[sendEvent],
	);

	// Feature 4: send sticker via data channel
	const handleSendSticker = useCallback(
		({ stickerId, x }) => {
			sendEvent("sticker", { stickerId, x });
		},
		[sendEvent],
	);

	const handleToggleHand = useCallback(() => {
		const nextRaised = !handRaised;
		setHandRaised(nextRaised);
		sendEvent(nextRaised ? "raise_hand" : "lower_hand", {});
	}, [handRaised, sendEvent]);

	const handleSendChat = useCallback(
		(text) => {
			sendEvent("chat", { text });
		},
		[sendEvent],
	);

	const toggleScreenShare = useCallback(async () => {
		try {
			await localParticipant.setScreenShareEnabled(
				!localParticipant.isScreenShareEnabled,
			);
		} catch {
			toast.error(
				"Tidak bisa berbagi layar (izin ditolak atau tidak didukung)",
			);
		}
	}, [localParticipant]);

	// Receiver identity for sawer — first remote participant or empty
	const receiverIdentity =
		remoteCameraTracks[0]?.participant?.identity ??
		remoteScreenTracks[0]?.participant?.identity ??
		"";

	return (
		<div className='flex flex-col h-full bg-[#202124]'>
			<div className='flex-1 relative p-3 overflow-hidden flex flex-col gap-2 min-h-0'>
				{sharingScreen && (
					<div className='flex-shrink-0 rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-2 text-center'>
						<p className='text-emerald-200 text-xs font-medium'>
							Layar Anda sedang dibagikan
						</p>
					</div>
				)}
				{remoteScreenTracks.length > 0 || remoteCameraTracks.length > 0 ? (
					<div className='flex-1 flex flex-col gap-2 min-h-0 overflow-hidden'>
						{remoteScreenTracks.length > 0 && (
							<div
								className='grid gap-2 flex-shrink-0 min-h-[35%]'
								style={{
									gridTemplateColumns:
										remoteScreenTracks.length === 1 ? "1fr" : "repeat(2, 1fr)",
								}}
							>
								{remoteScreenTracks.map((t) => (
									<VideoTile
										key={`${t.participant.identity}-screenshare`}
										track={t}
									/>
								))}
							</div>
						)}
						<div
							className='flex-1 min-h-0 grid gap-2'
							style={{
								gridTemplateColumns:
									remoteCameraTracks.length <= 1 ? "1fr" : "repeat(2, 1fr)",
							}}
						>
							{remoteCameraTracks.map((t) => (
								<VideoTile key={t.participant.identity} track={t} />
							))}
						</div>
					</div>
				) : (
					<div className='h-full flex items-center justify-center flex-1'>
						<div className='flex flex-col items-center gap-3 text-white/50'>
							<Users className='w-12 h-12' />
							<p className='text-sm'>Menunggu peserta lain…</p>
						</div>
					</div>
				)}

				{/* Local PiP — Feature 1: black when videoOff */}
				<div className='absolute bottom-3 right-3 w-32 h-24 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black'>
					{localTrack && !videoOff ? (
						<VideoTrack
							trackRef={localTrack}
							className='w-full h-full object-cover'
						/>
					) : (
						/* Feature 1: pure black screen instead of avatar */
						<div className='w-full h-full bg-black' />
					)}
					<div className='absolute bottom-1 left-1 right-1 text-center'>
						<span className='text-white text-[10px] bg-black/50 px-1 rounded'>
							{localParticipant.name || "Kamu"}
						</span>
					</div>
				</div>

				{/* Feature 3+4: floating event overlay */}
				<CallEventOverlay events={events} />

				{/* Feature 3: Sawer panel */}
				{showSawer && (
					<SawerPanel
						roomId={callData?.roomId}
						receiverIdentity={receiverIdentity}
						onSend={handleSendSawer}
						onClose={() => setShowSawer(false)}
					/>
				)}

				{/* Feature 4+5: Sticker panel */}
				{showSticker && (
					<StickerPanel
						onSend={handleSendSticker}
						onClose={() => setShowSticker(false)}
					/>
				)}

				{showParticipants && (
					<ParticipantList
						raisedHands={raisedHands}
						onClose={() => setShowParticipants(false)}
					/>
				)}

				{showChat && (
					<CallChat
						messages={chatMessages}
						onSend={handleSendChat}
						onClose={() => setShowChat(false)}
					/>
				)}
			</div>

			<RoomAudioRenderer />

			{/* Toolbar */}
			<div className='flex items-center justify-center gap-2 border-t border-white/10 bg-[#202124] px-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3 sm:py-5 flex-wrap'>
				<CtrlBtn
					active={muted}
					onClick={toggleMic}
					label={muted ? "Nyalakan mikrofon" : "Mute mikrofon"}
				>
					{muted ? (
						<MicOff className='w-5 h-5 text-white' />
					) : (
						<Mic className='w-5 h-5 text-white' />
					)}
				</CtrlBtn>

				<CtrlBtn
					active={videoOff}
					onClick={toggleCamera}
					label={videoOff ? "Nyalakan kamera" : "Matikan kamera"}
				>
					{videoOff ? (
						<VideoOff className='w-5 h-5 text-white' />
					) : (
						<Video className='w-5 h-5 text-white' />
					)}
				</CtrlBtn>

				<CtrlBtn
					active={sharingScreen}
					onClick={toggleScreenShare}
					label={sharingScreen ? "hentikan berbagi layar" : "Berbagi layar"}
				>
					{sharingScreen ? (
						<MonitorStopIcon className='w-5 h-5 text-white' />
					) : (
						<Monitor className='w-5 h-5 text-white' />
					)}
				</CtrlBtn>

				{/* Feature 2: flip camera */}
				<CtrlBtn onClick={handleFlipCamera} label='Balik kamera'>
					<RotateCcw className='w-5 h-5 text-white' />
				</CtrlBtn>

				{/* Feature 3: sawer */}
				<CtrlBtn
					active={showSawer}
					onClick={() => {
						setShowSawer((v) => !v);
						setShowSticker(false);
					}}
					label='Sawer koin'
				>
					<Coins className='w-5 h-5 text-yellow-300' />
				</CtrlBtn>

				{/* Feature 4+5: stickers */}
				<CtrlBtn
					active={showSticker}
					onClick={() => {
						setShowSticker((v) => !v);
						setShowSawer(false);
					}}
					label='Stiker'
				>
					<SmilePlus className='w-5 h-5 text-emerald-300' />
				</CtrlBtn>

				{/* Raise hand */}
				<CtrlBtn
					active={handRaised}
					onClick={handleToggleHand}
					label={handRaised ? "Turunkan tangan" : "Angkat tangan"}
				>
					<Hand className={`w-5 h-5 ${handRaised ? "text-yellow-300" : "text-white"}`} />
				</CtrlBtn>

				{/* Participant list */}
				<CtrlBtn
					active={showParticipants}
					onClick={() => {
						setShowParticipants((v) => !v);
						setShowChat(false);
					}}
					label="Daftar peserta"
				>
					<Users className="w-5 h-5 text-white" />
				</CtrlBtn>

				{/* In-call chat */}
				<CtrlBtn
					active={showChat}
					onClick={() => {
						setShowChat((v) => !v);
						setShowParticipants(false);
					}}
					label="Chat"
				>
					<MessageSquare className="w-5 h-5 text-white" />
				</CtrlBtn>

				<EndBtn onClick={onEndCall} />
			</div>
		</div>
	);
};

// ── Reusable control button ───────────────────────────────────────────────────
const CtrlBtn = ({ active, onClick, label, children }) => (
	<button
		type='button'
		onClick={onClick}
		className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124] ${
			active ? "bg-red-500 hover:bg-red-600" : "bg-[#3c4043] hover:bg-[#4a4d51]"
		}`}
		aria-label={label}
		title={label}
	>
		{children}
	</button>
);

const EndBtn = ({ onClick }) => (
	<button
		type='button'
		onClick={onClick}
		className='w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124]'
		aria-label='Tinggalkan panggilan'
		title='Tinggalkan'
	>
		<PhoneOff className='w-6 h-6 text-white' />
	</button>
);

// ── CallPage ──────────────────────────────────────────────────────────────────
const CallPage = () => {
	const { roomId } = useParams();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { activeCall, endCall } = useCall();

	const kind = searchParams.get("kind") || "voice";
	const isVideo = kind === "video";

	const [callData] = useState(() => activeCall);
	const returnPath = callData?.returnPath || "/dashboard";
	const leavingRef = useRef(false);

	useEffect(() => {
		if (!callData) navigate(returnPath, { replace: true });
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleLeaveBtn = useCallback(() => {
		if (leavingRef.current) return;
		leavingRef.current = true;
		endCall(Number(roomId));
		navigate(returnPath, { replace: true });
	}, [endCall, roomId, navigate, returnPath]);

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
					{isVideo ? (
						<Video className='w-4 h-4 text-emerald-400' />
					) : (
						<Phone className='w-4 h-4 text-emerald-400' />
					)}
					<span className='text-sm font-medium'>
						{isVideo ? "Video Call" : "Voice Call"}
					</span>
				</div>
				<div className='flex items-center gap-1.5'>
					<div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
					<span className='text-emerald-400 text-xs'>Live</span>
				</div>
			</div>

			<LiveKitRoom
				serverUrl={callData.liveKitUrl}
				token={callData.token}
				connect
				video={isVideo}
				audio
				onDisconnected={handleLKDisconnect}
				className='flex-1 flex flex-col overflow-hidden'
			>
				{isVideo ? (
					<VideoLayout onEndCall={handleLeaveBtn} callData={callData} />
				) : (
					<VoiceLayout onEndCall={handleLeaveBtn} />
				)}
			</LiveKitRoom>
		</div>
	);
};

export default CallPage;
