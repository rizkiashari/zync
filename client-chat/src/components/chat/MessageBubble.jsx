import { useState, useRef, useEffect } from "react";
import {
	CheckCheck,
	Reply,
	Copy,
	Trash2,
	CornerUpLeft,
	FileText,
	Download,
	Pin,
	PinOff,
	Bookmark,
	BookmarkCheck,
	MessageSquare,
	Smile,
	X,
	ZoomIn,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { formatMessageTime } from "../../data/mockData";
import toast from "react-hot-toast";
import { messageService } from "../../services/messageService";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EmojiPicker = ({ onSelect, onClose }) => {
	const ref = useRef(null);
	useEffect(() => {
		const h = (e) => {
			if (ref.current && !ref.current.contains(e.target)) onClose();
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [onClose]);
	return (
		<div
			ref={ref}
			className='flex gap-1 p-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 z-50'
		>
			{QUICK_EMOJIS.map((e) => (
				<button
					key={e}
					onClick={() => {
						onSelect(e);
						onClose();
					}}
					className='text-xl hover:scale-125 transition-transform p-0.5 rounded-lg hover:bg-slate-100'
				>
					{e}
				</button>
			))}
		</div>
	);
};

function parseFileMeta(text) {
	if (!text || !text.startsWith("{")) return null;
	try {
		const parsed = JSON.parse(text);
		if (parsed._type === "file") return parsed;
	} catch (_e) {
		return null;
	}
	return null;
}

const FilePreviewModal = ({ meta, onClose }) => {
	const fullUrl = messageService.fileUrl(meta.url);
	const isImage = meta.mime?.startsWith("image/");
	const isVideo = meta.mime?.startsWith("video/");
	const sizeStr =
		meta.size > 1024 * 1024
			? `${(meta.size / 1024 / 1024).toFixed(1)} MB`
			: `${(meta.size / 1024).toFixed(1)} KB`;

	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") onClose(); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'
			onClick={onClose}
		>
			<div
				className='relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex items-center justify-between px-4 py-3 border-b border-slate-100'>
					<div className='flex items-center gap-2 min-w-0'>
						<FileText className='w-4 h-4 text-indigo-500 flex-shrink-0' />
						<span className='text-sm font-medium text-slate-800 truncate'>{meta.name}</span>
						<span className='text-xs text-slate-400 flex-shrink-0'>{sizeStr}</span>
					</div>
					<div className='flex items-center gap-1 flex-shrink-0 ml-2'>
						<a
							href={fullUrl}
							download={meta.name}
							target='_blank'
							rel='noopener noreferrer'
							className='p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors'
							title='Unduh'
						>
							<Download className='w-4 h-4' />
						</a>
						<button
							onClick={onClose}
							className='p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors'
						>
							<X className='w-4 h-4' />
						</button>
					</div>
				</div>
				<div className='flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50'>
					{isImage ? (
						<img
							src={fullUrl}
							alt={meta.name}
							className='max-w-full max-h-[70vh] rounded-xl object-contain shadow'
						/>
					) : isVideo ? (
						<video
							src={fullUrl}
							controls
							className='max-w-full max-h-[70vh] rounded-xl shadow'
						/>
					) : (
						<div className='flex flex-col items-center gap-4 py-8'>
							<FileText className='w-16 h-16 text-indigo-300' />
							<p className='text-sm text-slate-600 font-medium'>{meta.name}</p>
							<p className='text-xs text-slate-400'>{meta.mime} · {sizeStr}</p>
							<a
								href={fullUrl}
								download={meta.name}
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors'
							>
								<Download className='w-4 h-4' />
								Unduh File
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const FileBubble = ({ meta, dark }) => {
	const [preview, setPreview] = useState(false);
	const isImage = meta.mime?.startsWith("image/");
	const fullUrl = messageService.fileUrl(meta.url);
	const sizeStr =
		meta.size > 1024 * 1024
			? `${(meta.size / 1024 / 1024).toFixed(1)} MB`
			: `${(meta.size / 1024).toFixed(1)} KB`;
	if (isImage) {
		return (
			<>
				<button
					type='button'
					onClick={() => setPreview(true)}
					className='relative group'
				>
					<img
						src={fullUrl}
						alt={meta.name}
						className='max-w-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity'
					/>
					<div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
						<ZoomIn className='w-8 h-8 text-white drop-shadow' />
					</div>
				</button>
				{preview && <FilePreviewModal meta={meta} onClose={() => setPreview(false)} />}
			</>
		);
	}
	return (
		<>
			<button
				type='button'
				onClick={() => setPreview(true)}
				className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
					dark
						? "border-white/20 bg-white/10 hover:bg-white/20"
						: "border-slate-200 bg-slate-50 hover:bg-slate-100"
				} transition-colors w-full text-left`}
			>
				<FileText
					className={`w-8 h-8 flex-shrink-0 ${
						dark ? "text-white/70" : "text-indigo-500"
					}`}
				/>
				<div className='min-w-0 flex-1'>
					<p
						className={`text-xs font-medium truncate ${
							dark ? "text-white" : "text-slate-800"
						}`}
					>
						{meta.name}
					</p>
					<p className={`text-xs ${dark ? "text-white/60" : "text-slate-400"}`}>
						{sizeStr}
					</p>
				</div>
				<Download
					className={`w-4 h-4 flex-shrink-0 ${
						dark ? "text-white/70" : "text-slate-500"
					}`}
				/>
			</button>
			{preview && <FilePreviewModal meta={meta} onClose={() => setPreview(false)} />}
		</>
	);
};

const ReactionBar = ({ reactions = [], onReact, messageId }) => {
	const [showPicker, setShowPicker] = useState(false);
	if (reactions.length === 0 && !onReact) return null;
	return (
		<div className='relative flex items-center gap-1 flex-wrap mt-1'>
			{reactions.map((r) => (
				<button
					key={r.emoji}
					onClick={() => onReact?.(messageId, r.emoji, r.reacted_by_me)}
					className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
						r.reacted_by_me
							? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
							: "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
					}`}
				>
					<span>{r.emoji}</span>
					<span>{r.count}</span>
				</button>
			))}
			{onReact && (
				<div className='relative'>
					<button
						onClick={() => setShowPicker((p) => !p)}
						className='flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors'
					>
						<Smile className='w-3.5 h-3.5' />
					</button>
					{showPicker && (
						<div className='absolute bottom-8 left-0 z-50'>
							<EmojiPicker
								onSelect={(emoji) => onReact?.(messageId, emoji, false)}
								onClose={() => setShowPicker(false)}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const ContextMenu = ({
	x,
	y,
	isOwn,
	onReply,
	onCopy,
	onDelete,
	onPin,
	isPinned,
	onBookmark,
	isBookmarked,
	onOpenThread,
	onClose,
}) => {
	const ref = useRef(null);

	useEffect(() => {
		const handler = (e) => {
			if (ref.current && !ref.current.contains(e.target)) onClose();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [onClose]);

	const style = {
		position: "fixed",
		left: Math.min(x, window.innerWidth - 180),
		top: Math.min(y, window.innerHeight - 160),
		zIndex: 9999,
	};

	return (
		<div
			ref={ref}
			style={style}
			className='bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44 text-sm overflow-hidden'
		>
			<button
				onClick={onReply}
				className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
			>
				<Reply className='w-4 h-4 text-indigo-500' />
				Balas
			</button>
			{onOpenThread && (
				<button
					onClick={onOpenThread}
					className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
				>
					<MessageSquare className='w-4 h-4 text-indigo-500' />
					Lihat Thread
				</button>
			)}
			<button
				onClick={onCopy}
				className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
			>
				<Copy className='w-4 h-4 text-slate-500' />
				Salin
			</button>
			{onBookmark && (
				<button
					onClick={onBookmark}
					className='w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-slate-700 transition-colors'
				>
					{isBookmarked ? (
						<>
							<BookmarkCheck className='w-4 h-4 text-indigo-500' />
							<span>Tersimpan</span>
						</>
					) : (
						<>
							<Bookmark className='w-4 h-4 text-slate-500' />
							<span>Simpan</span>
						</>
					)}
				</button>
			)}
			{onPin && (
				<button
					onClick={onPin}
					className='w-full flex items-center gap-3 px-3 py-2 hover:bg-amber-50 text-slate-700 transition-colors'
				>
					{isPinned ? (
						<>
							<PinOff className='w-4 h-4 text-amber-500' />
							<span>Lepas Sematan</span>
						</>
					) : (
						<>
							<Pin className='w-4 h-4 text-amber-500' />
							<span>Sematkan</span>
						</>
					)}
				</button>
			)}
			{isOwn && (
				<>
					<div className='h-px bg-slate-100 my-1' />
					<button
						onClick={onDelete}
						className='w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors'
					>
						<Trash2 className='w-4 h-4' />
						Hapus
					</button>
				</>
			)}
		</div>
	);
};

const ReplyPreview = ({ replyTo, dark = false }) => (
	<div
		className={`flex items-start gap-1.5 mb-1.5 px-2 py-1.5 rounded-lg border-l-2 max-w-full
    ${dark ? "bg-black/10 border-white/50" : "bg-slate-100 border-indigo-400"}`}
	>
		<CornerUpLeft className='w-3 h-3 flex-shrink-0 mt-0.5 opacity-60' />
		<div className='min-w-0'>
			<p
				className={`text-xs font-semibold truncate ${
					dark ? "text-white/80" : "text-indigo-600"
				}`}
			>
				{replyTo.senderName}
			</p>
			<p
				className={`text-xs truncate ${
					dark ? "text-white/60" : "text-slate-500"
				}`}
			>
				{replyTo.text}
			</p>
		</div>
	</div>
);

const MessageBubble = ({
	message,
	isOwn,
	showAvatar = true,
	senderName,
	isGroup = false,
	onReply,
	onDelete,
	onPin,
	pinnedMessageId,
	onBookmark,
	bookmarkedIds = [],
	onOpenThread,
	threadCount = 0,
	reactions = [],
	onReact,
	// currentUserId unused — kept for future use
}) => {
	const [menu, setMenu] = useState(null);
	const time = formatMessageTime(message.timestamp);
	const isDeleted = message.deleted;
	const isPinned = pinnedMessageId === message.id;
	const isBookmarked = bookmarkedIds.includes(message.id);

	const handleContextMenu = (e) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY });
	};

	const handleCopy = () => {
		if (!isDeleted)
			navigator.clipboard
				.writeText(message.text)
				.then(() => toast.success("Pesan disalin"));
		setMenu(null);
	};

	const handleReply = () => {
		onReply?.(message);
		setMenu(null);
	};

	const handleDelete = () => {
		onDelete?.(message.id);
		setMenu(null);
	};

	const handlePin = () => {
		onPin?.(isPinned ? null : message.id, message);
		setMenu(null);
	};

	const handleBookmark = () => {
		onBookmark?.(message.id, isBookmarked);
		setMenu(null);
	};

	const handleOpenThread = () => {
		onOpenThread?.(message);
		setMenu(null);
	};

	if (isOwn) {
		return (
			<>
				<div
					className='flex justify-end mb-1 group'
					onContextMenu={handleContextMenu}
				>
					<div className='flex flex-col items-end max-w-[70%]'>
						{message.replyTo && (
							<div className='bg-indigo-700 px-4 pt-2.5 pb-1 rounded-t-2xl w-full'>
								<ReplyPreview replyTo={message.replyTo} dark />
							</div>
						)}
						<div
							className={`bg-indigo-600 text-white px-4 py-2.5 shadow-sm w-full
              ${
								message.replyTo
									? "rounded-b-2xl rounded-bl-2xl"
									: "rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl"
							}`}
						>
							{isDeleted ? (
								<p className='text-sm italic opacity-60'>Pesan dihapus</p>
							) : (
								(() => {
									const fileMeta = parseFileMeta(message.text);
									if (fileMeta)
										return <FileBubble meta={fileMeta} dark={isOwn} />;
									return (
										<p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
											{message.text}
										</p>
									);
								})()
							)}
						</div>
						<div className='flex items-center gap-1 mt-1 px-1'>
							<span className='text-xs text-slate-400'>{time}</span>
							{!isDeleted && (
								<CheckCheck
									className={`w-3.5 h-3.5 ${
										message.read ? "text-indigo-500" : "text-slate-400"
									}`}
								/>
							)}
						</div>
						{!isDeleted && (
							<div className='flex justify-end'>
								<ReactionBar
									reactions={reactions}
									onReact={onReact}
									messageId={message.id}
								/>
							</div>
						)}
						{threadCount > 0 && !isDeleted && (
							<button
								onClick={() => onOpenThread?.(message)}
								className='flex items-center gap-1 mt-1 px-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors'
							>
								<MessageSquare className='w-3 h-3' />
								<span>{threadCount} balasan</span>
							</button>
						)}
					</div>
				</div>
				{menu && (
					<ContextMenu
						x={menu.x}
						y={menu.y}
						isOwn
						onReply={handleReply}
						onCopy={handleCopy}
						onDelete={handleDelete}
						onPin={onPin ? handlePin : undefined}
						isPinned={isPinned}
						onBookmark={onBookmark ? handleBookmark : undefined}
						isBookmarked={isBookmarked}
						onClose={() => setMenu(null)}
						onOpenThread={onOpenThread ? handleOpenThread : undefined}
					/>
				)}
			</>
		);
	}

	return (
		<>
			<div
				className='flex items-end gap-2 mb-1 group'
				onContextMenu={handleContextMenu}
			>
				<div className='flex-shrink-0 w-8'>
					{showAvatar && (
						<Avatar name={senderName || message.senderName} size='sm' />
					)}
				</div>
				<div className='flex flex-col max-w-[70%]'>
					{isGroup && senderName && !message.replyTo && (
						<span className='text-xs font-medium text-indigo-600 mb-1 ml-1'>
							{senderName}
						</span>
					)}
					{message.replyTo && (
						<div className='bg-slate-200 px-4 pt-2.5 pb-1 rounded-t-2xl w-full'>
							{isGroup && senderName && (
								<p className='text-xs font-medium text-indigo-600 mb-0.5'>
									{senderName}
								</p>
							)}
							<ReplyPreview replyTo={message.replyTo} />
						</div>
					)}
					<div
						className={`bg-white text-slate-800 px-4 py-2.5 shadow-sm border border-slate-100 w-full
            ${
							message.replyTo
								? "rounded-b-2xl rounded-br-2xl"
								: "rounded-tr-2xl rounded-br-2xl rounded-tl-2xl"
						}`}
					>
						{isDeleted ? (
							<p className='text-sm italic text-slate-400'>Pesan dihapus</p>
						) : (
							(() => {
								const fileMeta = parseFileMeta(message.text);
								if (fileMeta)
									return <FileBubble meta={fileMeta} dark={false} />;
								return (
									<p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
										{message.text}
									</p>
								);
							})()
						)}
					</div>
					<span className='text-xs text-slate-400 mt-1 ml-1'>{time}</span>
				</div>
				{!isDeleted && (
					<ReactionBar
						reactions={reactions}
						onReact={onReact}
						messageId={message.id}
					/>
				)}
				{threadCount > 0 && !isDeleted && (
					<button
						onClick={() => onOpenThread?.(message)}
						className='flex items-center gap-1 mt-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors'
					>
						<MessageSquare className='w-3 h-3' />
						<span>{threadCount} balasan</span>
					</button>
				)}
			</div>
			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					isOwn={false}
					onReply={handleReply}
					onCopy={handleCopy}
					onDelete={handleDelete}
					onPin={onPin ? handlePin : undefined}
					isPinned={isPinned}
					onBookmark={onBookmark ? handleBookmark : undefined}
					isBookmarked={isBookmarked}
					onOpenThread={onOpenThread ? handleOpenThread : undefined}
					onClose={() => setMenu(null)}
				/>
			)}
		</>
	);
};

export default MessageBubble;
