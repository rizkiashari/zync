import { useState, useEffect } from "react";
import { X, FileText, Download, Image, File } from "lucide-react";
import { messageService } from "../../services/messageService";

const TABS = [
	{ id: "all", label: "Semua" },
	{ id: "images", label: "Gambar" },
	{ id: "docs", label: "Dokumen" },
];

function parseFileMeta(body) {
	if (!body || !body.startsWith("{")) return null;
	try {
		const p = JSON.parse(body);
		if (p._type === "file") return p;
	} catch {
		return null;
	}
	return null;
}

const MediaGallery = ({ roomId, onClose }) => {
	const [files, setFiles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("all");
	const [lightbox, setLightbox] = useState(null);

	useEffect(() => {
		let cancelled = false;
		messageService
			.listFiles(roomId)
			.then((res) => {
				if (cancelled) return;
				const parsed = (res.data.data || [])
					.map((msg) => ({
						...parseFileMeta(msg.body),
						msgId: msg.id,
						createdAt: msg.created_at,
					}))
					.filter(Boolean);
				setFiles(parsed);
			})
			.catch(() => {
				if (!cancelled) setFiles([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [roomId]);

	const filtered = files.filter((f) => {
		if (activeTab === "images") return f.mime?.startsWith("image/");
		if (activeTab === "docs") return !f.mime?.startsWith("image/");
		return true;
	});

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
			<div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden'>
				{/* Header */}
				<div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
					<h2 className='text-base font-semibold text-slate-800'>Galeri & File</h2>
					<button
						type='button'
						onClick={onClose}
						className='w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors'
					>
						<X className='w-4 h-4' />
					</button>
				</div>

				{/* Tabs */}
				<div className='flex gap-1 px-4 pt-3 pb-2'>
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type='button'
							onClick={() => setActiveTab(tab.id)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
								activeTab === tab.id ?
									"bg-indigo-600 text-white"
								:	"text-slate-500 hover:bg-slate-100"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Content */}
				<div className='flex-1 overflow-y-auto px-4 pb-4'>
					{loading ?
						<div className='flex items-center justify-center h-32'>
							<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
						</div>
					: filtered.length === 0 ?
						<div className='flex flex-col items-center justify-center h-32 gap-2 text-slate-400'>
							{activeTab === "images" ?
								<Image className='w-8 h-8' />
							:	<File className='w-8 h-8' />}
							<p className='text-sm'>Tidak ada file</p>
						</div>
					: activeTab === "images" ?
						<div className='grid grid-cols-3 gap-2 mt-2'>
							{filtered.map((f) => (
								<button
									key={f.msgId}
									type='button'
									onClick={() => setLightbox(f)}
									className='aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity'
								>
									<img
										src={messageService.fileUrl(f.url)}
										alt={f.name}
										className='w-full h-full object-cover'
									/>
								</button>
							))}
						</div>
					:	<div className='mt-2 space-y-2'>
							{filtered.map((f) => {
								const isImage = f.mime?.startsWith("image/");
								const sizeStr =
									f.size > 1024 * 1024 ?
										`${(f.size / 1024 / 1024).toFixed(1)} MB`
									:	`${(f.size / 1024).toFixed(1)} KB`;
								return (
									<div
										key={f.msgId}
										className='flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors'
									>
										{isImage ?
											<img
												src={messageService.fileUrl(f.url)}
												alt={f.name}
												className='w-10 h-10 rounded-lg object-cover flex-shrink-0'
											/>
										:	<div className='w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 flex-shrink-0'>
												<FileText className='w-5 h-5 text-indigo-500' />
											</div>}
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-medium text-slate-800 truncate'>{f.name}</p>
											<p className='text-xs text-slate-400'>{sizeStr}</p>
										</div>
										<a
											href={messageService.fileUrl(f.url)}
											download={f.name}
											target='_blank'
											rel='noopener noreferrer'
											className='w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors'
										>
											<Download className='w-4 h-4' />
										</a>
									</div>
								);
							})}
						</div>
					}
				</div>
			</div>

			{/* Lightbox */}
			{lightbox && (
				<div
					className='fixed inset-0 z-60 flex items-center justify-center bg-black/80'
					onClick={() => setLightbox(null)}
				>
					<button
						type='button'
						className='absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors'
						onClick={() => setLightbox(null)}
					>
						<X className='w-5 h-5' />
					</button>
					<img
						src={messageService.fileUrl(lightbox.url)}
						alt={lightbox.name}
						className='max-w-[90vw] max-h-[85vh] rounded-xl object-contain'
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			)}
		</div>
	);
};

export default MediaGallery;
