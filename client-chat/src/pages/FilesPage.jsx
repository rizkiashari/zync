import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import MainShell from "../components/layout/MainShell";
import { messageService } from "../services/messageService";
import { selectAllRooms } from "../store/roomsSlice";
import {
	FileText,
	Image,
	Download,
	Search,
	Filter,
	FolderOpen,
	Folder,
	Loader2,
	List,
	LayoutGrid,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const MIME_FILTERS = [
	{ label: "Semua", value: "" },
	{ label: "Gambar", value: "image/" },
	{ label: "Dokumen", value: "application/" },
	{ label: "Video", value: "video/" },
];

function parseFileMeta(body) {
	if (!body || !body.startsWith("{")) return null;
	try {
		const parsed = JSON.parse(body);
		if (parsed._type === "file") return parsed;
	} catch {
		return null;
	}
	return null;
}

function formatSize(bytes) {
	if (!bytes) return "—";
	if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(ts) {
	if (!ts) return "";
	return new Date(ts).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

const FileRow = ({ msg }) => {
	const meta = parseFileMeta(msg.body);
	if (!meta) return null;
	const isImage = meta.mime?.startsWith("image/");
	const fullUrl = messageService.fileUrl(meta.url);

	return (
		<div className='flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors'>
			<div className='w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden'>
				{isImage ? (
					<img
						src={fullUrl}
						alt={meta.name}
						className='w-full h-full object-cover rounded-xl'
						onError={(e) => {
							e.target.style.display = "none";
						}}
					/>
				) : (
					<FileText className='w-5 h-5 text-indigo-500' />
				)}
			</div>
			<div className='flex-1 min-w-0'>
				<p className='text-sm font-medium text-slate-800 truncate'>{meta.name}</p>
				<p className='text-xs text-slate-400'>
					{formatSize(meta.size)} · {formatDate(msg.created_at)}
				</p>
			</div>
			<a
				href={fullUrl}
				download={meta.name}
				target='_blank'
				rel='noopener noreferrer'
				className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0'
				title='Unduh'
			>
				<Download className='w-4 h-4' />
			</a>
		</div>
	);
};

const FolderGroup = ({ roomName, files }) => {
	const [open, setOpen] = useState(true);

	return (
		<div className='border border-slate-200 rounded-xl overflow-hidden mb-3'>
			<button
				type='button'
				onClick={() => setOpen((v) => !v)}
				className='w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left'
			>
				{open ? (
					<FolderOpen className='w-4 h-4 text-amber-500 flex-shrink-0' />
				) : (
					<Folder className='w-4 h-4 text-amber-500 flex-shrink-0' />
				)}
				<span className='flex-1 text-sm font-semibold text-slate-700 truncate'>
					{roomName}
				</span>
				<span className='text-xs text-slate-400 flex-shrink-0'>{files.length} file</span>
				{open ? (
					<ChevronDown className='w-4 h-4 text-slate-400 flex-shrink-0' />
				) : (
					<ChevronRight className='w-4 h-4 text-slate-400 flex-shrink-0' />
				)}
			</button>
			{open && (
				<div>
					{files.map((msg) => (
						<FileRow key={msg.id} msg={msg} />
					))}
				</div>
			)}
		</div>
	);
};

const FilesPage = () => {
	const workspace = useSelector((s) => s.workspace.current);
	const rooms = useSelector(selectAllRooms);
	const [files, setFiles] = useState([]);
	const [loading, setLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [mimeFilter, setMimeFilter] = useState("");
	const [roomFilter, setRoomFilter] = useState("");
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [viewMode, setViewMode] = useState("list"); // "list" | "folder"
	const LIMIT = 50;

	const loadFiles = useCallback(
		async (reset = false) => {
			if (!workspace?.id) return;
			setLoading(true);
			try {
				const params = {
					limit: LIMIT,
					offset: reset ? 0 : offset,
					...(mimeFilter && { mime: mimeFilter }),
					...(search && { q: search }),
					...(roomFilter && { room_id: roomFilter }),
				};
				const res = await messageService.listWorkspaceFiles(workspace.id, params);
				const data = res.data?.data || [];
				if (reset) {
					setFiles(data);
					setOffset(data.length);
				} else {
					setFiles((prev) => [...prev, ...data]);
					setOffset((prev) => prev + data.length);
				}
				setHasMore(data.length === LIMIT);
			} catch {
				toast.error("Gagal memuat file");
			} finally {
				setLoading(false);
			}
		},
		[workspace?.id, mimeFilter, search, roomFilter, offset],
	);

	useEffect(() => {
		setOffset(0);
		setHasMore(true);
		loadFiles(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workspace?.id, mimeFilter, search, roomFilter]);

	const roomName = (roomId) => {
		const r = rooms.find((rm) => rm.id === Number(roomId));
		return r?.name || `Room ${roomId}`;
	};

	// Group files by room_id for folder view
	const folderGroups = useMemo(() => {
		const map = new Map();
		for (const msg of files) {
			const key = msg.room_id ?? "unknown";
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(msg);
		}
		return [...map.entries()].map(([rid, msgs]) => ({
			roomId: rid,
			name: rid === "unknown" ? "Tidak diketahui" : roomName(rid),
			files: msgs,
		}));
	}, [files, rooms]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<MainShell>
			<div className='flex flex-1 flex-col min-h-0'>
				{/* Header */}
				<div className='border-b border-slate-200 bg-white px-6 py-4'>
					<div className='flex items-center justify-between gap-3 mb-4'>
						<div className='flex items-center gap-3'>
							<div className='w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center'>
								<FolderOpen className='w-5 h-5 text-indigo-600' />
							</div>
							<div>
								<h1 className='text-lg font-semibold text-slate-900'>File Manager</h1>
								<p className='text-xs text-slate-500'>Semua file di workspace ini</p>
							</div>
						</div>
						{/* View toggle */}
						<div className='flex items-center bg-slate-100 rounded-xl p-1 gap-1'>
							<button
								type='button'
								onClick={() => setViewMode("list")}
								title='Tampilan daftar'
								className={`p-1.5 rounded-lg transition-all ${
									viewMode === "list"
										? "bg-white text-indigo-600 shadow-sm"
										: "text-slate-500 hover:text-slate-700"
								}`}
							>
								<List className='w-4 h-4' />
							</button>
							<button
								type='button'
								onClick={() => setViewMode("folder")}
								title='Tampilan folder'
								className={`p-1.5 rounded-lg transition-all ${
									viewMode === "folder"
										? "bg-white text-indigo-600 shadow-sm"
										: "text-slate-500 hover:text-slate-700"
								}`}
							>
								<LayoutGrid className='w-4 h-4' />
							</button>
						</div>
					</div>

					{/* Filters */}
					<div className='flex flex-wrap gap-2'>
						<div className='relative flex-1 min-w-48'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
							<input
								type='text'
								placeholder='Cari nama file...'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className='w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
							/>
						</div>

						<div className='flex items-center gap-1 bg-slate-100 rounded-xl p-1'>
							{MIME_FILTERS.map((f) => (
								<button
									key={f.value}
									type='button'
									onClick={() => setMimeFilter(f.value)}
									className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
										mimeFilter === f.value
											? "bg-white text-indigo-600 shadow-sm"
											: "text-slate-500 hover:text-slate-700"
									}`}
								>
									{f.label}
								</button>
							))}
						</div>

						{viewMode === "list" && (
							<div className='relative'>
								<Filter className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400' />
								<select
									value={roomFilter}
									onChange={(e) => setRoomFilter(e.target.value)}
									className='pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none min-w-36'
								>
									<option value=''>Semua room</option>
									{rooms.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name || `Room ${r.id}`}
										</option>
									))}
								</select>
							</div>
						)}
					</div>
				</div>

				{/* Content */}
				<div className='flex-1 overflow-y-auto bg-white'>
					{loading && files.length === 0 ? (
						<div className='flex justify-center py-12'>
							<Loader2 className='w-6 h-6 animate-spin text-slate-400' />
						</div>
					) : files.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-16 gap-3 text-slate-400'>
							<Image className='w-12 h-12 opacity-30' />
							<p className='text-sm'>Belum ada file yang dibagikan</p>
						</div>
					) : viewMode === "folder" ? (
						<div className='p-4'>
							{folderGroups.map((group) => (
								<FolderGroup
									key={group.roomId}
									roomName={group.name}
									files={group.files}
								/>
							))}
						</div>
					) : (
						<>
							{files.map((msg) => (
								<FileRow key={msg.id} msg={msg} />
							))}
							{hasMore && (
								<div className='flex justify-center py-4'>
									<button
										type='button'
										onClick={() => loadFiles(false)}
										disabled={loading}
										className='px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors'
									>
										{loading ? (
											<Loader2 className='w-4 h-4 animate-spin' />
										) : (
											"Muat lebih banyak"
										)}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</MainShell>
	);
};

export default FilesPage;
