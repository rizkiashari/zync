import { useRef, useState, useEffect } from "react";
import {
	Send,
	Smile,
	Paperclip,
	X,
	FileText,
	CornerUpLeft,
	Image,
} from "lucide-react";
import toast from "react-hot-toast";
import { messageService } from "../../services/messageService";

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

const MessageInput = ({ onSend, onTyping, replyTo, onCancelReply, roomId }) => {
	const [text, setText] = useState("");
	const [attachedFile, setAttachedFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const textareaRef = useRef(null);
	const fileInputRef = useRef(null);
	const imageInputRef = useRef(null);

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
		(text.trim().length > 0 || attachedFile !== null) && !uploading;

	return (
		<div className='border-t border-slate-100 bg-white flex-shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
			{replyTo && <ReplyBar replyTo={replyTo} onCancel={onCancelReply} />}
			{attachedFile && (
				<FilePreview
					file={attachedFile}
					onRemove={() => !uploading && setAttachedFile(null)}
				/>
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
						disabled={uploading}
						className='flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none leading-relaxed py-1 max-h-[120px] overflow-y-auto disabled:opacity-50'
					/>

					<div className='flex items-center gap-1 flex-shrink-0 mb-0.5'>
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
							disabled={uploading}
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
							disabled={uploading}
							onClick={() => fileInputRef.current?.click()}
							className='p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40'
							title='Kirim dokumen'
						>
							<Paperclip className='w-5 h-5' />
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
		</div>
	);
};

export default MessageInput;
