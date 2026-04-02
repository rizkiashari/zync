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
	ChevronRight,
	FolderKanban,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import MainShell from "../components/layout/MainShell";
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
import { cardClean, focusRing } from "../lib/uiClasses";
import AdOnboarding from "../components/onboarding/AdOnboarding";

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
		className={`relative rounded-2xl p-5 overflow-hidden shadow-clean ring-1 ring-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-white/25 ${gradient}`}
	>
		<div className='absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full' />
		<div className='absolute -right-1 top-6 w-10 h-10 bg-white/10 rounded-full' />
		<div
			className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3 shadow-inner`}
		>
			<Icon className='w-4 h-4 text-white' aria-hidden />
		</div>
		<p className='text-2xl font-bold text-white leading-none mb-1 tabular-nums'>
			{value}
		</p>
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
			className={`w-full flex items-center gap-3 mx-0.5 px-5 py-3.5 rounded-xl hover:bg-slate-50/90 transition-colors duration-200 text-left group ${focusRing}`}
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
	const workspace = useAppSelector((s) => s.workspace.current);
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

	const todayLabel = new Date().toLocaleDateString("id-ID", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	return (
		<MainShell>
			<div
				className='min-h-0 flex-1 overflow-y-auto scrollbar-light'
				style={{
					backgroundImage:
						"radial-gradient(900px 480px at 85% 0%, rgba(99,102,241,0.07), transparent 55%), radial-gradient(700px 420px at 10% 20%, rgba(139,92,246,0.06), transparent 50%), radial-gradient(600px 400px at 50% 100%, rgba(14,165,233,0.05), transparent 55%)",
				}}
			>
				{/* ── Hero banner ─────────────────────────────── */}
				<AdOnboarding
					variant='dashboard'
					user={user}
					onGoPricing={() => navigate("/pricing")}
					onCreateGroup={() => dispatch(openCreateGroup())}
					onGoTasks={() => navigate("/tasks")}
					onSkipToContent={() =>
						document
							.getElementById("dashboard-content")
							?.scrollIntoView({ behavior: "smooth" })
					}
				/>

				{/* ── Content ─────────── */}
				<div
					id='dashboard-content'
					className='relative z-10 mt-4 max-w-6xl mx-auto w-full px-4 sm:px-6 pb-10 pt-2 space-y-6'
				>
					<div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-1'>
						<div>
							<p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
								Ringkasan workspace
							</p>
							<p className='text-sm text-slate-600 mt-1'>
								{workspace?.custom_name || workspace?.name ?
									<span className='font-semibold text-slate-800'>
										{workspace?.custom_name || workspace?.name}
									</span>
								:	<span className='text-slate-500'>Workspace aktif</span>}
								<span className='text-slate-400 mx-2' aria-hidden>
									·
								</span>
								<time
									dateTime={new Date().toISOString()}
									className='text-slate-500'
								>
									{todayLabel}
								</time>
							</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							<button
								type='button'
								onClick={() => navigate("/tasks")}
								className={`text-xs font-semibold text-indigo-700 bg-white border border-indigo-200/80 shadow-sm px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors ${focusRing}`}
							>
								Task Hub
							</button>
							<button
								type='button'
								onClick={() => dispatch(openCreateGroup())}
								className={`text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-sm px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors ${focusRing}`}
							>
								<Plus
									className='w-3.5 h-3.5 inline-block -mt-0.5 mr-1'
									aria-hidden
								/>
								Grup baru
							</button>
						</div>
					</div>

					{/* Stats row */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4'>
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
					<section
						id='dashboard-task-columns'
						className={`${cardClean} overflow-hidden ring-2 ring-slate-200/90 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]`}
						aria-labelledby='task-columns-heading'
					>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-5 border-b border-slate-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-white'>
							<div className='flex items-start gap-3 min-w-0'>
								<div className='w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/25'>
									<ClipboardList className='w-5 h-5 text-white' aria-hidden />
								</div>
								<div className='min-w-0 pt-0.5'>
									<p className='text-[11px] font-bold uppercase tracking-wider text-indigo-600'>
										Board gabungan
									</p>
									<h2
										id='task-columns-heading'
										className='text-base font-bold text-slate-900 tracking-tight mt-0.5'
									>
										Task per kolom
									</h2>
									<p className='text-sm text-slate-600 mt-1 leading-snug max-w-prose'>
										Ringkasan dari semua grup Anda: tugas dikelompokkan menurut
										nama kolom (mis. Todo, In Progress).
									</p>
								</div>
							</div>
							<button
								type='button'
								onClick={() => navigate("/tasks")}
								className={`flex-shrink-0 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-600/20 ${focusRing}`}
							>
								Buka Task Hub
								<ChevronRight className='w-4 h-4' aria-hidden />
							</button>
						</div>

						<div className='p-5 sm:p-6 bg-slate-50/50'>
							{groupRooms.length === 0 && (
								<div className='rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center'>
									<div className='w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3'>
										<FolderKanban
											className='w-6 h-6 text-slate-400'
											aria-hidden
										/>
									</div>
									<p className='text-sm font-semibold text-slate-700'>
										Belum ada grup
									</p>
									<p className='text-sm text-slate-500 mt-1 max-w-sm mx-auto'>
										Buat grup dulu, lalu tambahkan board task di kanban agar
										ringkasan muncul di sini.
									</p>
								</div>
							)}

							{groupRooms.length > 0 && taskOverviewLoading && (
								<div
									className='flex flex-col items-center justify-center gap-3 py-12 rounded-2xl bg-white border border-slate-200/80'
									aria-busy
									aria-live='polite'
								>
									<div className='w-9 h-9 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin' />
									<p className='text-sm font-medium text-slate-600'>
										Memuat task dari board grup…
									</p>
								</div>
							)}

							{groupRooms.length > 0 &&
								!taskOverviewLoading &&
								taskColumnSections.length === 0 && (
									<div className='rounded-2xl border-2 border-dashed border-amber-200/80 bg-amber-50/50 px-6 py-8 text-center'>
										<p className='text-sm font-semibold text-amber-900'>
											Belum ada kolom atau task
										</p>
										<p className='text-sm text-amber-800/80 mt-1'>
											Buka salah satu grup → Kanban untuk menambah kolom dan
											card task.
										</p>
									</div>
								)}

							{groupRooms.length > 0 &&
								!taskOverviewLoading &&
								taskColumnSections.length > 0 && (
									<div className='space-y-5'>
										{taskColumnSections.map((section) => (
											<div
												key={section.name}
												className='rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm'
											>
												<div className='flex flex-wrap items-center justify-between gap-2 mb-4'>
													<div
														className='flex items-center gap-2 min-w-0 rounded-xl pl-3 pr-3 py-2 border-l-[4px]'
														style={{
															backgroundColor: `${section.color}14`,
															borderLeftColor: section.color,
														}}
													>
														<span className='text-sm font-bold text-slate-900 truncate'>
															{section.name}
														</span>
													</div>
													<span className='text-xs font-bold tabular-nums text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg'>
														{section.tasks.length} task
													</span>
												</div>
												{section.tasks.length === 0 ?
													<p className='text-sm text-slate-500 font-medium pl-1 py-2 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/80'>
														Tidak ada task di kolom ini
													</p>
												:	<ul className='space-y-2.5'>
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
																		className={`w-full flex items-start gap-3 text-left rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 px-3.5 py-3 transition-all shadow-sm ${focusRing}`}
																	>
																		<div className='flex-1 min-w-0'>
																			<p className='text-sm font-semibold text-slate-900 leading-snug'>
																				{t.title}
																			</p>
																			<p className='text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5'>
																				<Users className='w-3.5 h-3.5 text-slate-400 flex-shrink-0' />
																				<span className='truncate'>
																					{t.groupName}
																				</span>
																			</p>
																		</div>
																		<span
																			className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md flex-shrink-0 ${pr.className}`}
																		>
																			{pr.label}
																		</span>
																		<ChevronRight
																			className='w-4 h-4 text-slate-300 flex-shrink-0 mt-1'
																			aria-hidden
																		/>
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
					</section>

					{/* Online contacts */}
					{onlineContacts.length > 0 && (
						<div className={`${cardClean} p-5 ring-1 ring-slate-200/60`}>
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4'>
								Online sekarang · {onlineContacts.length}
							</p>
							<div className='flex gap-5 overflow-x-auto pb-1 scrollbar-light'>
								{onlineContacts.map((c) => (
									<button
										key={c.id}
										onClick={async () => {
											const result = await dispatch(createDirectRoom(c.id));
											const room = result.payload;
											if (room?.id) navigate(`/chat/${room.id}`);
										}}
										className={`flex flex-col items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity ${focusRing} rounded-xl py-1`}
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
					<div
						className={`${cardClean} overflow-hidden ring-1 ring-slate-200/60`}
					>
						<div className='flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white'>
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
					<div
						className={`${cardClean} overflow-hidden ring-1 ring-slate-200/60`}
					>
						<div className='flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white'>
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
		</MainShell>
	);
};

export default DashboardPage;
