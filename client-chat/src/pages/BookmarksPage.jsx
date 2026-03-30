import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { bookmarkService } from "../services/bookmarkService";
import { messageService } from "../services/messageService";
import { useAuth } from "../context/AuthContext";
import { Bookmark, FileText, ArrowRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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

const BookmarksPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [bookmarks, setBookmarks] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchBookmarks = () => {
		setLoading(true);
		bookmarkService
			.list()
			.then((res) => setBookmarks(res.data.data || []))
			.catch(() => setBookmarks([]))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		fetchBookmarks();
	}, []);

	const handleRemove = async (bmId, msgId) => {
		try {
			await bookmarkService.remove(msgId);
			setBookmarks((prev) => prev.filter((b) => b.bookmark_id !== bmId));
			toast.success("Bookmark dihapus");
		} catch {
			toast.error("Gagal menghapus bookmark");
		}
	};

	const goToRoom = (roomId) => {
		navigate(`/chat/${roomId}`);
	};

	// Group by room
	const grouped = bookmarks.reduce((acc, bm) => {
		if (!acc[bm.room_id]) acc[bm.room_id] = [];
		acc[bm.room_id].push(bm);
		return acc;
	}, {});

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />
			<div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
				{/* Header */}
				<div className='flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200/80 flex-shrink-0'>
					<div className='w-9 h-9 flex items-center justify-center bg-indigo-50 rounded-xl'>
						<Bookmark className='w-5 h-5 text-indigo-600' />
					</div>
					<div>
						<h1 className='text-base font-semibold text-slate-900'>Tersimpan</h1>
						<p className='text-xs text-slate-400'>{bookmarks.length} pesan tersimpan</p>
					</div>
				</div>

				<div className='flex-1 overflow-y-auto px-6 py-4'>
					{loading ?
						<div className='flex items-center justify-center h-32'>
							<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
						</div>
					: bookmarks.length === 0 ?
						<div className='flex flex-col items-center justify-center h-48 gap-3 text-slate-400'>
							<Bookmark className='w-10 h-10' />
							<p className='text-sm font-medium'>Belum ada pesan tersimpan</p>
							<p className='text-xs text-center max-w-xs'>
								Klik kanan pada pesan lalu pilih "Simpan" untuk menyimpan pesan penting.
							</p>
						</div>
					:	<div className='max-w-2xl mx-auto space-y-6'>
							{Object.entries(grouped).map(([roomId, items]) => (
								<div key={roomId}>
									<div className='flex items-center justify-between mb-2'>
										<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>
											Room #{roomId}
										</span>
										<button
											type='button'
											onClick={() => goToRoom(roomId)}
											className='flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors'
										>
											Buka <ArrowRight className='w-3 h-3' />
										</button>
									</div>
									<div className='space-y-2'>
										{items.map((bm) => {
											const fileMeta = parseFileMeta(bm.body);
											const isOwn = Number(bm.sender_id) === Number(user?.id);
											return (
												<div
													key={bm.bookmark_id}
													className='flex items-start gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group'
												>
													<div className='flex-1 min-w-0'>
														<div className='flex items-center gap-2 mb-1'>
															<span className='text-xs font-medium text-slate-500'>
																{isOwn ? "Kamu" : `User ${bm.sender_id}`}
															</span>
															<span className='text-xs text-slate-400'>·</span>
															<span className='text-xs text-slate-400'>
																{new Date(bm.created_at).toLocaleDateString("id-ID", {
																	day: "numeric",
																	month: "short",
																	hour: "2-digit",
																	minute: "2-digit",
																})}
															</span>
														</div>
														{fileMeta ?
															<div className='flex items-center gap-2'>
																{fileMeta.mime?.startsWith("image/") ?
																	<img
																		src={messageService.fileUrl(fileMeta.url)}
																		alt={fileMeta.name}
																		className='w-12 h-12 rounded-lg object-cover'
																	/>
																:	<div className='w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg'>
																		<FileText className='w-5 h-5 text-slate-500' />
																	</div>}
																<span className='text-sm text-slate-700 truncate'>{fileMeta.name}</span>
															</div>
														:	<p className='text-sm text-slate-800 line-clamp-3'>{bm.body}</p>}
													</div>
													<button
														type='button'
														onClick={() => handleRemove(bm.bookmark_id, bm.message_id)}
														className='opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0'
														aria-label='Hapus bookmark'
													>
														<Trash2 className='w-4 h-4' />
													</button>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					}
				</div>
			</div>
		</div>
	);
};

export default BookmarksPage;
