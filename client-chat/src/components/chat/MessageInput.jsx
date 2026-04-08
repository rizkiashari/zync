import { useRef, useState, useEffect, useCallback } from "react";
import {
	Send,
	Smile,
	Paperclip,
	X,
	FileText,
	CornerUpLeft,
	Image,
	Mic,
	Square,
	BarChart2,
	Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { messageService } from "../../services/messageService";
import PollCreator from "./PollCreator";
import ScheduleMessageModal from "./ScheduleMessageModal";

const ReplyBar = ({ replyTo, onCancel }) => (
	<div className='flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100'>
		<CornerUpLeft className='w-4 h-4 text-indigo-500 flex-shrink-0' />
		<div className='flex-1 min-w-0'>
			<p className='text-xs font-semibold text-indigo-600 truncate'>
				{replyTo.senderName}
			</p>
			<p className='text-xs text-slate-500 truncate'>{replyTo.text}</p>
		</div>
		<button
			onClick={onCancel}
			className='p-1 rounded-full hover:bg-indigo-100 text-indigo-400 transition-colors flex-shrink-0'
		>
			<X className='w-3.5 h-3.5' />
		</button>
	</div>
);

const FilePreview = ({ file, onRemove }) => {
	const isImage = file.type.startsWith("image/");
	const url = URL.createObjectURL(file);

	return (
		<div className='flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100'>
			{isImage ?
				<img
					src={url}
					alt={file.name}
					className='w-12 h-12 object-cover rounded-lg border border-slate-200'
				/>
			:	<div className='w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center'>
					<FileText className='w-5 h-5 text-slate-500' />
				</div>
			}
			<div className='flex-1 min-w-0'>
				<p className='text-xs font-medium text-slate-700 truncate'>
					{file.name}
				</p>
				<p className='text-xs text-slate-400'>
					{(file.size / 1024).toFixed(1)} KB
				</p>
			</div>
			<button
				onClick={onRemove}
				className='p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors flex-shrink-0'
			>
				<X className='w-3.5 h-3.5' />
			</button>
		</div>
	);
};

function pickAudioMime() {
	if (typeof MediaRecorder === "undefined") return "";
	if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
		return "audio/webm;codecs=opus";
	}
	if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
	if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
	return "";
}

const MessageInput = ({ onSend, onTyping, replyTo, onCancelReply, roomId, onPollCreated }) => {
	const [text, setText] = useState("");
	const [attachedFile, setAttachedFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [recording, setRecording] = useState(false);
	const [recordSeconds, setRecordSeconds] = useState(0);
	const [showPollCreator, setShowPollCreator] = useState(false);
	const [showSchedule, setShowSchedule] = useState(false);
	const textareaRef = useRef(null);
	const fileInputRef = useRef(null);
	const imageInputRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const streamRef = useRef(null);
	const chunksRef = useRef([]);
	const recordMimeRef = useRef("");
	const tickRef = useRef(null);

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height =
				Math.min(textareaRef.current.scrollHeight, 120) + "px";
		}
	}, [text]);

	// Focus input when reply is set
	useEffect(() => {
		if (replyTo) textareaRef.current?.focus();
	}, [replyTo]);

	useEffect(
		() => () => {
			if (tickRef.current) clearInterval(tickRef.current);
			if (mediaRecorderRef.current?.state === "recording") {
				mediaRecorderRef.current.stop();
			}
			streamRef.current?.getTracks().forEach((t) => t.stop());
		},
		[],
	);

	const stopRecordingInternal = useCallback(() => {
		if (tickRef.current) {
			clearInterval(tickRef.current);
			tickRef.current = null;
		}
		setRecordSeconds(0);
		if (mediaRecorderRef.current?.state === "recording") {
			mediaRecorderRef.current.stop();
		} else {
			streamRef.current?.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		}
	}, []);

	const finalizeVoiceUpload = useCallback(
		async (blob, mime, reply) => {
			if (!roomId || !blob.size) return;
			const ext =
				mime.includes("mp4") ? "mp4"
				: mime.includes("webm") ? "webm"
				: mime.includes("ogg") ? "ogg"
				: "webm";
			const file = new File([blob], `voice-${Date.now()}.${ext}`, {
				type: mime || "audio/webm",
			});
			setUploading(true);
			try {
				const res = await messageService.uploadFile(roomId, file);
				const { url, name, mime: serverMime, size } = res.data.data;
				const fileMeta = JSON.stringify({
					_type: "file",
					url,
					name,
					mime: serverMime || mime,
					size,
				});
				onSend(fileMeta, null, reply ?? null);
			} catch {
				toast.error("Gagal mengunggah pesan suara");
			}
			setUploading(false);
		},
		[roomId, onSend],
	);

	const handleToggleVoiceRecord = useCallback(async () => {
		if (recording) {
			stopRecordingInternal();
			return;
		}
		if (!roomId) {
			toast.error("Room belum siap");
			return;
		}
		if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			toast.error("Perekaman suara tidak didukung di perangkat ini");
			return;
		}
		let mime = pickAudioMime();
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const rec =
				mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
			mime = mime || rec.mimeType || "audio/webm";
			recordMimeRef.current = mime;
			chunksRef.current = [];
			rec.ondataavailable = (e) => {
				if (e.data?.size) chunksRef.current.push(e.data);
			};
			rec.onstop = () => {
				stream.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
				mediaRecorderRef.current = null;
				const blob = new Blob(chunksRef.current, { type: recordMimeRef.current });
				chunksRef.current = [];
				setRecording(false);
				onTyping?.(false);
				if (blob.size > 0) {
					finalizeVoiceUpload(blob, recordMimeRef.current, replyTo);
				}
			};
			mediaRecorderRef.current = rec;
			rec.start(200);
			setRecording(true);
			setRecordSeconds(0);
			tickRef.current = setInterval(() => {
				setRecordSeconds((s) => s + 1);
			}, 1000);
		} catch {
			toast.error("Izinkan mikrofon untuk rekaman suara");
		}
	}, [
		recording,
		roomId,
		stopRecordingInternal,
		finalizeVoiceUpload,
		replyTo,
		onTyping,
	]);

	const handleSend = async () => {
		const trimmed = text.trim();
		if (!trimmed && !attachedFile) return;

		if (attachedFile && roomId) {
			setUploading(true);
			try {
				const res = await messageService.uploadFile(roomId, attachedFile);
				const { url, name, mime, size } = res.data.data;
				const fileMeta = JSON.stringify({
					_type: "file",
					url,
					name,
					mime,
					size,
				});
				onSend(fileMeta, null, replyTo);
				if (trimmed) onSend(trimmed, null, null);
			} catch {
				toast.error("Gagal mengunggah file");
				setUploading(false);
				return;
			}
			setUploading(false);
		} else if (trimmed) {
			onSend(trimmed, null, replyTo);
		}

		setText("");
		setAttachedFile(null);
		if (textareaRef.current) textareaRef.current.style.height = "auto";
		onTyping?.(false);
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleChange = (e) => {
		setText(e.target.value);
		onTyping?.(e.target.value.length > 0);
	};

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			toast.error("Ukuran file maksimal 10 MB");
			return;
		}
		setAttachedFile(file);
		e.target.value = "";
	};

	const canSend =
		(text.trim().length > 0 || attachedFile !== null) && !uploading && !recording;

	const fmtRec = `${String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:${String(recordSeconds % 60).padStart(2, "0")}`;

	return (
		<div className='border-t border-slate-100 bg-white flex-shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
			{replyTo && <ReplyBar replyTo={replyTo} onCancel={onCancelReply} />}
			{attachedFile && (
				<FilePreview
					file={attachedFile}
					onRemove={() => !uploading && setAttachedFile(null)}
				/>
			)}
			{recording && (
				<div className='flex items-center justify-center gap-3 px-4 py-2 bg-rose-50 border-b border-rose-100'>
					<span className='relative flex h-2.5 w-2.5'>
						<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75' />
						<span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500' />
					</span>
					<span className='text-sm font-mono font-medium text-rose-800'>{fmtRec}</span>
					<span className='text-xs text-rose-600'>Rekaman… ketuk lagi untuk kirim</span>
				</div>
			)}

			<div className='px-4 py-3'>
				<div className='flex items-end gap-2 bg-slate-50 rounded-2xl px-3 py-2 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all'>
					<button
						type='button'
						className='flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors mb-0.5'
						title='Emoji'
					>
						<Smile className='w-5 h-5' />
					</button>

					<textarea
						ref={textareaRef}
						value={text}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder={
							replyTo ? `Balas ${replyTo.senderName}...` : "Ketik pesan..."
						}
						rows={1}
						disabled={uploading || recording}
						className='flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none leading-relaxed py-1 max-h-[120px] overflow-y-auto disabled:opacity-50'
					/>

					<div className='flex items-center gap-1 flex-shrink-0 mb-0.5'>
						<button
							type='button'
							disabled={uploading || !roomId}
							onClick={handleToggleVoiceRecord}
							className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
								recording ?
									"text-white bg-rose-500 hover:bg-rose-600"
								:	"text-slate-400 hover:text-rose-600 hover:bg-rose-50"
							}`}
							title={recording ? "Selesai & kirim pesan suara" : "Rekam pesan suara"}
						>
							{recording ?
								<Square className='w-5 h-5 fill-current' />
							:	<Mic className='w-5 h-5' />}
						</button>
						{/* Image picker */}
						<input
							ref={imageInputRef}
							type='file'
							accept='image/*'
							className='hidden'
							onChange={handleFileChange}
						/>
						<button
							type='button'
							disabled={uploading || recording}
							onClick={() => imageInputRef.current?.click()}
							className='p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40'
							title='Kirim foto'
						>
							<Image className='w-5 h-5' />
						</button>
						{/* Document picker */}
						<input
							ref={fileInputRef}
							type='file'
							accept='.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip'
							className='hidden'
							onChange={handleFileChange}
						/>
						<button
							type='button'
							disabled={uploading || recording}
							onClick={() => fileInputRef.current?.click()}
							className='p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40'
							title='Kirim dokumen'
						>
							<Paperclip className='w-5 h-5' />
						</button>
						{/* Poll */}
						<button
							type='button'
							disabled={uploading || recording}
							onClick={() => setShowPollCreator(true)}
							className='p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40'
							title='Buat poll'
						>
							<BarChart2 className='w-5 h-5' />
						</button>
						{/* Schedule message */}
						<button
							type='button'
							disabled={uploading || recording || !text.trim()}
							onClick={() => setShowSchedule(true)}
							className='p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40'
							title='Jadwalkan pesan'
						>
							<Clock className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={handleSend}
							disabled={!canSend}
							className={`p-2 rounded-xl transition-all duration-200 ${
								canSend ?
									"bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
								:	"bg-slate-200 text-slate-400 cursor-not-allowed"
							}`}
						>
							{uploading ?
								<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
							:	<Send className='w-4 h-4' />}
						</button>
					</div>
				</div>
				<p className='text-xs text-slate-400 mt-1.5 text-center'>
					Enter untuk kirim · Shift+Enter untuk baris baru
				</p>
			</div>

			{showPollCreator && (
				<PollCreator
					roomId={roomId}
					onClose={() => setShowPollCreator(false)}
					onCreated={(poll) => {
						setShowPollCreator(false);
						onPollCreated?.(poll);
					}}
				/>
			)}
			{showSchedule && (
				<ScheduleMessageModal
					roomId={roomId}
					text={text}
					replyTo={replyTo}
					onClose={() => setShowSchedule(false)}
					onScheduled={() => {
						setText("");
						if (textareaRef.current) textareaRef.current.style.height = "auto";
						onTyping?.(false);
					}}
				/>
			)}
		</div>
	);
};

export default MessageInput;
