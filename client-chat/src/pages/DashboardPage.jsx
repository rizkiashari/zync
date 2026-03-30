import {
	MessageCircle,
	Users,
	Bell,
	Star,
	ArrowRight,
	Plus,
	GripVertical,
	CalendarClock,
	ClipboardList,
	Flag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/layout/Sidebar";
import Avatar from "../components/ui/Avatar";
import CreateGroupModal from "../components/group/CreateGroupModal";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useAppDispatch, useAppSelector } from "../store/index";
import {
	fetchDashboard,
	selectAllRooms,
	createDirectRoom,
} from "../store/roomsSlice";
import { openCreateGroup, closeCreateGroup } from "../store/uiSlice";
import { recentTaskService } from "../services/recentTaskService";
import { buildTaskColumnSections, priorityMeta } from "../lib/taskOverview";
import { useGroupTaskBoards } from "../hooks/useGroupTaskBoards";
import { cardClean } from "../lib/uiClasses";

/* ─── Helpers ──────────────────────────────────────────── */
const formatTime = (dateStr) => {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	const now = new Date();
	const diff = now - d;
	const min = Math.floor(diff / 60000);
	const hr = Math.floor(diff / 3600000);
	const day = Math.floor(diff / 86400000);
	if (min < 1) return "Baru saja";
	if (min < 60) return `${min} mnt lalu`;
	if (hr < 24)
		return d.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
		});
	if (day === 1) return "Kemarin";
	return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

/* ─── Stat card ────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, gradient, iconBg }) => (
	<div
		className={`relative rounded-2xl p-5 overflow-hidden shadow-clean ring-1 ring-white/15 ${gradient}`}
	>
		<div className='absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full' />
		<div className='absolute -right-1 top-6 w-10 h-10 bg-white/10 rounded-full' />
		<div
			className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}
		>
			<Icon className='w-4 h-4 text-white' />
		</div>
		<p className='text-2xl font-bold text-white leading-none mb-1'>{value}</p>
		<p className='text-xs text-white/70 font-medium'>{label}</p>
	</div>
);

/* ─── Recent chat row ──────────────────────────────────── */
const ChatRow = ({ room, isOnline, onClick }) => {
	const isGroup = room.type === "group";
	const unread = room.unread_count || 0;
	const displayName = room.name || (isGroup ? "Grup" : "Chat");
	return (
		<button
			type='button'
			onClick={onClick}
			className='w-full flex items-center gap-3 mx-0.5 px-5 py-3.5 rounded-xl hover:bg-slate-50/90 transition-colors duration-200 text-left group'
		>
			{isGroup ?
				<div className='w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-clean ring-1 ring-black/5'>
					<Users className='w-5 h-5 text-white' />
				</div>
			:	<Avatar name={displayName} size='md' online={isOnline} />}
			<div className='flex-1 min-w-0'>
				<div className='flex justify-between items-baseline gap-2'>
					<p className='text-sm font-semibold text-slate-800 truncate'>
						{displayName}
					</p>
					<span className='text-[11px] text-slate-400 flex-shrink-0'>
						{formatTime(room.last_message_at)}
					</span>
				</div>
				<p
					className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}
				>
					{room.last_message || "Belum ada pesan"}
				</p>
			</div>
			{unread > 0 ?
				<span className='flex-shrink-0 min-w-[20px] h-5 bg-indigo-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5'>
					{unread > 9 ? "9+" : unread}
				</span>
			:	<ArrowRight className='w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0' />
			}
		</button>
	);
};

const formatTaskOpenedTime = (isoDate) => {
	if (!isoDate) return "";
	const d = new Date(isoDate);
	const diff = Date.now() - d.getTime();
	const min = Math.floor(diff / 60000);
	const hr = Math.floor(diff / 3600000);
	if (min < 1) return "Baru saja";
	if (min < 60) return `${min} mnt lalu`;
	if (hr < 24) return `${hr} jam lalu`;
	return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

/* ─── Page ─────────────────────────────────────────────── */
const DashboardPage = () => {
	const { user } = useAuth();
	const { onlineUsers } = useSocket();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const rooms = useAppSelector(selectAllRooms);
	const stats = useAppSelector((s) => s.rooms.stats);
	const onlineServerUsers = useAppSelector((s) => s.rooms.onlineUsers);
	const showCreateGroup = useAppSelector((s) => s.ui.showCreateGroup);
	const [recentTasks, setRecentTasks] = useState([]);
	const [dragIndex, setDragIndex] = useState(null);
	useEffect(() => {
		dispatch(fetchDashboard());
	}, [dispatch]);

	// Load recent tasks from DB (source of truth).
	useEffect(() => {
		let cancelled = false;
		const loadRecents = async () => {
			try {
				const res = await recentTaskService.list();
				if (cancelled) return;
				const items = res?.data?.data || [];
				setRecentTasks(Array.isArray(items) ? items : []);
			} catch {
				// Non-blocking: dashboard can still render without recents.
				if (!cancelled) setRecentTasks([]);
			}
		};
		loadRecents();
		return () => {
			cancelled = true;
		};
	}, []);

	const groupRooms = useMemo(
		() => rooms.filter((r) => r.type === "group"),
		[rooms],
	);

	const { boardsByRoomId, loading: taskOverviewLoading } =
		useGroupTaskBoards(groupRooms);

	const taskColumnSections = useMemo(
		() => buildTaskColumnSections(groupRooms, boardsByRoomId),
		[groupRooms, boardsByRoomId],
	);

	const onlineContacts = onlineServerUsers.filter((u) => u.id !== user?.id);
	const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
	const recentRooms = rooms.slice(0, 8);

	const getGreeting = () => {
		const h = new Date().getHours();
		if (h < 12) return "Selamat pagi";
		if (h < 15) return "Selamat siang";
		if (h < 18) return "Selamat sore";
		return "Selamat malam";
	};

	const handleRoomClick = (room) => {
		if (room.type === "group") navigate(`/group/${room.id}`);
		else navigate(`/chat/${room.id}`);
	};

	const handleTaskDrop = async (toIndex) => {
		if (dragIndex === null) return;
		const current = [...recentTasks];
		if (
			toIndex < 0 ||
			dragIndex < 0 ||
			dragIndex >= current.length ||
			toIndex >= current.length ||
			dragIndex === toIndex
		) {
			setDragIndex(null);
			return;
		}

		const [moved] = current.splice(dragIndex, 1);
		current.splice(toIndex, 0, moved);
		setRecentTasks(current);
		setDragIndex(null);

		// Persist ordering to DB (best-effort).
		try {
			await recentTaskService.reorder(current.map((t) => t.id));
		} catch {
			// Non-blocking: UI already updated.
			console.error("Failed to persist recent task order");
		}
	};

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />

			<div className='flex-1 overflow-y-auto'>
				{/* ── Hero banner ─────────────────────────────── */}
				<div className='relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 pt-8 pb-16 overflow-hidden'>
					<div className='absolute -top-10 -right-10 w-56 h-56 bg-white/5 rounded-full' />
					<div className='absolute top-4 right-32 w-20 h-20 bg-white/5 rounded-full' />
					<div className='absolute -bottom-8 left-40 w-40 h-40 bg-white/5 rounded-full' />

					<div className='relative flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<div className='ring-4 ring-white/20 rounded-full'>
								<Avatar name={user?.username || user?.name} size='xl' online />
							</div>
							<div>
								<p className='text-indigo-200 text-sm mb-0.5'>
									{getGreeting()},
								</p>
								<h1 className='text-white text-2xl font-bold leading-tight'>
									{(user?.username || user?.name || "").split(" ")[0]}!
								</h1>
							</div>
						</div>

						<div className='flex flex-wrap items-center gap-2'>
							<button
								type='button'
								onClick={() => navigate("/tasks")}
								className='flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/35 transition-all hover:bg-white/25'
							>
								<ClipboardList className='w-4 h-4' />
								Task hub
							</button>
							<button
								type='button'
								onClick={() => dispatch(openCreateGroup())}
								className='flex items-center gap-2 bg-white text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-clean-md ring-1 ring-black/5 hover:bg-indigo-50 hover:shadow-clean'
							>
								<Plus className='w-4 h-4' />
								Grup Baru
							</button>
						</div>
					</div>
				</div>

				{/* ── Content ─────────── */}
				<div className='px-6 -mt-8 pb-8 space-y-5'>
					{/* Stats row */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
						<StatCard
							icon={MessageCircle}
							label='Total Room'
							value={stats.room_count ?? rooms.length}
							gradient='bg-gradient-to-br from-indigo-500 to-indigo-700'
							iconBg='bg-white/20'
						/>
						<StatCard
							icon={Users}
							label='Grup Aktif'
							value={rooms.filter((r) => r.type === "group").length}
							gradient='bg-gradient-to-br from-violet-500 to-violet-700'
							iconBg='bg-white/20'
						/>
						<StatCard
							icon={Bell}
							label='Belum Dibaca'
							value={totalUnread}
							gradient='bg-gradient-to-br from-rose-500 to-rose-700'
							iconBg='bg-white/20'
						/>
						<StatCard
							icon={Star}
							label='Online'
							value={stats.online_users ?? onlineContacts.length}
							gradient='bg-gradient-to-br from-emerald-500 to-emerald-700'
							iconBg='bg-white/20'
						/>
					</div>

					{/* Ringkasan task per kolom (semua grup) */}
					<div className={`${cardClean} overflow-hidden`}>
						<div className='flex items-center justify-between px-5 py-4 border-b border-slate-50 gap-3'>
							<div className='flex items-center gap-2 min-w-0'>
								<div className='w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0'>
									<ClipboardList className='w-4 h-4 text-indigo-600' />
								</div>
								<div className='min-w-0'>
									<p className='text-sm font-semibold text-slate-800'>
										Task per kolom
									</p>
									<p className='text-xs text-slate-400 mt-0.5'>
										Dari board semua grup Anda (Todo, Backlog, In Progress,
										dll.)
									</p>
								</div>
							</div>
							<button
								type='button'
								onClick={() => navigate("/tasks")}
								className='flex-shrink-0 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors'
							>
								Hub task →
							</button>
						</div>

						{groupRooms.length === 0 && (
							<p className='text-sm text-slate-400 text-center py-8 px-5'>
								Belum ada grup — buat grup untuk pakai board task.
							</p>
						)}

						{groupRooms.length > 0 && taskOverviewLoading && (
							<div className='flex justify-center py-10'>
								<div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
							</div>
						)}

						{groupRooms.length > 0 &&
							!taskOverviewLoading &&
							taskColumnSections.length === 0 && (
								<p className='text-sm text-slate-400 text-center py-8 px-5'>
									Belum ada kolom atau task
								</p>
							)}

						{groupRooms.length > 0 &&
							!taskOverviewLoading &&
							taskColumnSections.length > 0 && (
								<div className='divide-y divide-slate-100'>
									{taskColumnSections.map((section) => (
										<div key={section.name} className='px-5 py-4'>
											<div
												className='flex items-center gap-2 mb-3 rounded-lg px-3 py-2'
												style={{
													backgroundColor: `${section.color}18`,
													borderLeft: `3px solid ${section.color}`,
												}}
											>
												<span className='text-sm font-semibold text-slate-800'>
													{section.name}
												</span>
												<span className='text-xs text-slate-500 font-medium'>
													{section.tasks.length} task
												</span>
											</div>
											{section.tasks.length === 0 ?
												<p className='text-xs text-slate-400 pl-1'>Kosong</p>
											:	<ul className='space-y-2'>
													{section.tasks.map((t) => {
														const pr =
															priorityMeta[t.priority] || priorityMeta.medium;
														return (
															<li key={t.id}>
																<button
																	type='button'
																	onClick={() =>
																		navigate(`/group/${t.groupId}/kanban`)
																	}
																	className='w-full flex items-start gap-3 text-left rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-indigo-200 px-3 py-2.5 transition-all'
																>
																	<div className='flex-1 min-w-0'>
																		<p className='text-sm font-medium text-slate-800 truncate'>
																			{t.title}
																		</p>
																		<p className='text-xs text-slate-500 truncate mt-0.5'>
																			{t.groupName}
																		</p>
																	</div>
																	<span
																		className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${pr.className}`}
																	>
																		<Flag className='w-2.5 h-2.5' />
																		{pr.label}
																	</span>
																</button>
															</li>
														);
													})}
												</ul>
											}
										</div>
									))}
								</div>
							)}
					</div>

					{/* Online contacts */}
					{onlineContacts.length > 0 && (
						<div className={`${cardClean} p-5`}>
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4'>
								Online Sekarang · {onlineContacts.length}
							</p>
							<div className='flex gap-5 overflow-x-auto pb-1'>
								{onlineContacts.map((c) => (
									<button
										key={c.id}
										onClick={async () => {
											const result = await dispatch(createDirectRoom(c.id));
											const room = result.payload;
											if (room?.id) navigate(`/chat/${room.id}`);
										}}
										className='flex flex-col items-center gap-2 flex-shrink-0 hover:opacity-75 transition-opacity'
									>
										<Avatar name={c.username || c.name} size='lg' online />
										<span className='text-xs text-slate-600 font-medium w-14 text-center truncate'>
											{(c.username || c.name || "").split(" ")[0]}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Recent conversations */}
					<div className={`${cardClean} overflow-hidden`}>
						<div className='flex items-center justify-between px-5 py-4 border-b border-slate-50'>
							<div>
								<p className='text-sm font-semibold text-slate-800'>
									Percakapan Terbaru
								</p>
								<p className='text-xs text-slate-400 mt-0.5'>
									{recentRooms.length} percakapan aktif
								</p>
							</div>
							{totalUnread > 0 && (
								<span className='text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full'>
									{totalUnread} belum dibaca
								</span>
							)}
						</div>
						<div className='divide-y divide-slate-50'>
							{recentRooms.length === 0 && (
								<p className='text-sm text-slate-400 text-center py-8'>
									Belum ada percakapan
								</p>
							)}
							{recentRooms.map((room) => (
								<ChatRow
									key={room.id}
									room={room}
									isOnline={onlineUsers.includes(room.id)}
									onClick={() => handleRoomClick(room)}
								/>
							))}
						</div>
					</div>

					{/* Recently opened tasks (drag & drop) */}
					<div className={`${cardClean} overflow-hidden`}>
						<div className='flex items-center justify-between px-5 py-4 border-b border-slate-50'>
							<div>
								<p className='text-sm font-semibold text-slate-800'>
									Task Terakhir Dibuka
								</p>
								<p className='text-xs text-slate-400 mt-0.5'>
									Drag & drop untuk mengatur urutan
								</p>
							</div>
							<span className='text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full'>
								{recentTasks.length} task
							</span>
						</div>
						<div className='divide-y divide-slate-50'>
							{recentTasks.length === 0 && (
								<p className='text-sm text-slate-400 text-center py-8'>
									Belum ada task yang dibuka
								</p>
							)}
							{recentTasks.map((task, idx) => (
								<div
									key={task.id}
									draggable
									onDragStart={() => setDragIndex(idx)}
									onDragOver={(e) => e.preventDefault()}
									onDrop={() => handleTaskDrop(idx)}
									onDragEnd={() => setDragIndex(null)}
									className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
										dragIndex === idx ? "bg-violet-50" : "hover:bg-slate-50"
									}`}
								>
									<GripVertical className='w-4 h-4 text-slate-300 flex-shrink-0 cursor-grab' />
									<button
										onClick={() => navigate(`/group/${task.groupId}/kanban`)}
										className='flex-1 min-w-0 text-left'
									>
										<p className='text-sm font-semibold text-slate-800 truncate'>
											{task.title}
										</p>
										<p className='text-xs text-slate-400 mt-0.5 truncate'>
											{task.groupName}
											{task.columnName ? ` · ${task.columnName}` : ""}
										</p>
									</button>
									<div className='flex items-center gap-2 flex-shrink-0'>
										{task.deadline_at && (
											<span className='inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full'>
												<CalendarClock className='w-3 h-3' />
												{new Date(task.deadline_at).toLocaleDateString(
													"id-ID",
													{
														day: "2-digit",
														month: "short",
													},
												)}
											</span>
										)}
										<span className='text-[11px] text-slate-400'>
											{formatTaskOpenedTime(task.lastOpenedAt)}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<CreateGroupModal
				isOpen={showCreateGroup}
				onClose={() => dispatch(closeCreateGroup())}
			/>
		</div>
	);
};

export default DashboardPage;
