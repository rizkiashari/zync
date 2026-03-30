import { useState, useRef, useEffect } from "react";
import {
	CheckCheck,
	Reply,
	Copy,
	Trash2,
	CornerUpLeft,
	FileText,
	Download,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { formatMessageTime } from "../../data/mockData";
import toast from "react-hot-toast";
import { messageService } from "../../services/messageService";

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

const FileBubble = ({ meta, dark }) => {
	const isImage = meta.mime?.startsWith("image/");
	const fullUrl = messageService.fileUrl(meta.url);
	const sizeStr =
		meta.size > 1024 * 1024 ?
			`${(meta.size / 1024 / 1024).toFixed(1)} MB`
		:	`${(meta.size / 1024).toFixed(1)} KB`;
	if (isImage) {
		return (
			<a href={fullUrl} target='_blank' rel='noopener noreferrer'>
				<img
					src={fullUrl}
					alt={meta.name}
					className='max-w-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity'
				/>
			</a>
		);
	}
	return (
		<a
			href={fullUrl}
			download={meta.name}
			target='_blank'
			rel='noopener noreferrer'
			className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dark ? "border-white/20 bg-white/10 hover:bg-white/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100"} transition-colors`}
		>
			<FileText
				className={`w-8 h-8 flex-shrink-0 ${dark ? "text-white/70" : "text-indigo-500"}`}
			/>
			<div className='min-w-0 flex-1'>
				<p
					className={`text-xs font-medium truncate ${dark ? "text-white" : "text-slate-800"}`}
				>
					{meta.name}
				</p>
				<p className={`text-xs ${dark ? "text-white/60" : "text-slate-400"}`}>
					{sizeStr}
				</p>
			</div>
			<Download
				className={`w-4 h-4 flex-shrink-0 ${dark ? "text-white/70" : "text-slate-500"}`}
			/>
		</a>
	);
};

const ContextMenu = ({ x, y, isOwn, onReply, onCopy, onDelete, onClose }) => {
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
		left: Math.min(x, window.innerWidth - 160),
		top: Math.min(y, window.innerHeight - 140),
		zIndex: 9999,
	};

	return (
		<div
			ref={ref}
			style={style}
			className='bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-40 text-sm overflow-hidden'
		>
			<button
				onClick={onReply}
				className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
			>
				<Reply className='w-4 h-4 text-indigo-500' />
				Balas
			</button>
			<button
				onClick={onCopy}
				className='w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors'
			>
				<Copy className='w-4 h-4 text-slate-500' />
				Salin
			</button>
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
				className={`text-xs font-semibold truncate ${dark ? "text-white/80" : "text-indigo-600"}`}
			>
				{replyTo.senderName}
			</p>
			<p
				className={`text-xs truncate ${dark ? "text-white/60" : "text-slate-500"}`}
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
}) => {
	const [menu, setMenu] = useState(null);
	const time = formatMessageTime(message.timestamp);
	const isDeleted = message.deleted;

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
              ${message.replyTo ? "rounded-b-2xl rounded-bl-2xl" : "rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl"}`}
						>
							{isDeleted ?
								<p className='text-sm italic opacity-60'>Pesan dihapus</p>
							:	(() => {
									const fileMeta = parseFileMeta(message.text);
									if (fileMeta)
										return <FileBubble meta={fileMeta} dark={isOwn} />;
									return (
										<p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
											{message.text}
										</p>
									);
								})()
							}
						</div>
						<div className='flex items-center gap-1 mt-1 px-1'>
							<span className='text-xs text-slate-400'>{time}</span>
							{!isDeleted && (
								<CheckCheck
									className={`w-3.5 h-3.5 ${message.read ? "text-indigo-500" : "text-slate-400"}`}
								/>
							)}
						</div>
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
						onClose={() => setMenu(null)}
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
            ${message.replyTo ? "rounded-b-2xl rounded-br-2xl" : "rounded-tr-2xl rounded-br-2xl rounded-tl-2xl"}`}
					>
						{isDeleted ?
							<p className='text-sm italic text-slate-400'>Pesan dihapus</p>
						:	(() => {
								const fileMeta = parseFileMeta(message.text);
								if (fileMeta)
									return <FileBubble meta={fileMeta} dark={false} />;
								return (
									<p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
										{message.text}
									</p>
								);
							})()
						}
					</div>
					<span className='text-xs text-slate-400 mt-1 ml-1'>{time}</span>
				</div>
			</div>
			{menu && (
				<ContextMenu
					x={menu.x}
					y={menu.y}
					isOwn={false}
					onReply={handleReply}
					onCopy={handleCopy}
					onDelete={handleDelete}
					onClose={() => setMenu(null)}
				/>
			)}
		</>
	);
};

export default MessageBubble;
