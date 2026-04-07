import { useState, useEffect, useMemo } from "react";
import {
	X,
	Crown,
	UserPlus,
	LogOut,
	Users,
	Search,
	Check,
	ChevronLeft,
	Trash2,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import ConfirmModal from "../ui/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useAppDispatch } from "../../store/index";
import { removeRoom } from "../../store/roomsSlice";
import { roomService } from "../../services/roomService";
import { workspaceService } from "../../services/workspaceService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const GroupInfo = ({ group, onClose, onMembersUpdated }) => {
	const { user } = useAuth();
	const { onlineUsers } = useSocket();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [workspaceMembers, setWorkspaceMembers] = useState([]);
	const [wsMembersStatus, setWsMembersStatus] = useState("idle");

	const [showAddPanel, setShowAddPanel] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [addingId, setAddingId] = useState(null);
	const [leaving, setLeaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirm, setConfirm] = useState(null);
	const [roleLoading, setRoleLoading] = useState({});

	const isAdmin = group.members?.some(
		(m) => m.id === user?.id && m.role === "admin",
	);
	const memberIds = new Set(group.members?.map((m) => m.id));

	useEffect(() => {
		if (!showAddPanel) {
			setSearchQuery("");
			return;
		}
		let cancelled = false;
		setWsMembersStatus("loading");
		setWorkspaceMembers([]);
		workspaceService
			.listMembers()
			.then((res) => {
				if (cancelled) return;
				setWorkspaceMembers(res?.data?.data?.members || []);
				setWsMembersStatus("succeeded");
			})
			.catch(() => {
				if (cancelled) return;
				setWorkspaceMembers([]);
				setWsMembersStatus("succeeded");
			});
		return () => {
			cancelled = true;
		};
	}, [showAddPanel]);

	const addCandidates = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return workspaceMembers
			.map((m) => ({
				id: m.user_id,
				username: m.username,
				email: m.email,
				department: m.department || "",
				is_online: onlineUsers.includes(m.user_id),
			}))
			.filter((u) => {
				if (u.id === user?.id) return false;
				if (!q) return true;
				return (
					(u.username || "").toLowerCase().includes(q) ||
					(u.email || "").toLowerCase().includes(q)
				);
			});
	}, [workspaceMembers, searchQuery, user?.id, onlineUsers]);

	const handleAddMember = async (targetUser) => {
		if (addingId) return;
		setAddingId(targetUser.id);
		try {
			await roomService.addMember(group.id, targetUser.id);
			toast.success(`${targetUser.username || targetUser.email} ditambahkan`);
			if (onMembersUpdated) {
				onMembersUpdated([
					...group.members,
					{
						id: targetUser.id,
						name: targetUser.username || targetUser.email,
						role: "member",
					},
				]);
			}
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal menambahkan anggota");
		} finally {
			setAddingId(null);
		}
	};

	const handleLeaveClick = () =>
		setConfirm({
			type: "leave",
			title: "Keluar Grup",
			message: "Yakin ingin keluar dari grup ini?",
		});
	const handleDeleteClick = () =>
		setConfirm({
			type: "delete",
			title: "Hapus Grup",
			message: "Hapus grup ini? Semua pesan akan dihapus permanen.",
		});

	const handleLeave = async () => {
		if (leaving) return;
		setLeaving(true);
		setConfirm(null);
		try {
			await roomService.leave(group.id);
			dispatch(removeRoom(group.id));
			toast.success("Kamu telah keluar dari grup");
			navigate("/dashboard");
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal keluar dari grup");
			setLeaving(false);
		}
	};

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		setConfirm(null);
		try {
			await roomService.deleteRoom(group.id);
			dispatch(removeRoom(group.id));
			toast.success("Grup dihapus");
			navigate("/dashboard");
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal menghapus grup");
			setDeleting(false);
		}
	};

	const handleRoleToggle = async (member) => {
		if (roleLoading[member.id]) return;
		const newRole = member.role === "admin" ? "member" : "admin";
		setRoleLoading((prev) => ({ ...prev, [member.id]: true }));
		try {
			await roomService.changeMemberRole(group.id, member.id, newRole);
			const updatedMembers = group.members.map((m) =>
				m.id === member.id ? { ...m, role: newRole } : m,
			);
			if (onMembersUpdated) onMembersUpdated(updatedMembers);
			toast.success(
				newRole === "admin" ?
					`${member.name} dijadikan admin`
				:	`${member.name} diturunkan ke member`,
			);
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal mengubah peran");
		} finally {
			setRoleLoading((prev) => ({ ...prev, [member.id]: false }));
		}
	};

	if (!group) return null;

	return (
		<div className='flex h-full w-72 max-w-full flex-col border-l border-slate-200 bg-white max-lg:fixed max-lg:inset-0 max-lg:z-[60] max-lg:w-full max-lg:border-l-0 max-lg:shadow-2xl'>
			{/* Header */}
			<div className='flex items-center justify-between border-b border-slate-100 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]'>
				{showAddPanel ?
					<button
						onClick={() => setShowAddPanel(false)}
						className='flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors'
					>
						<ChevronLeft className='w-4 h-4' />
						Tambah Anggota
					</button>
				:	<h3 className='font-semibold text-slate-800'>Info Grup</h3>}
				<button
					onClick={onClose}
					className='p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors'
				>
					<X className='w-4 h-4' />
				</button>
			</div>

			{showAddPanel ?
				/* Add Member Panel */
				<div className='flex-1 flex flex-col overflow-hidden'>
					<div className='px-4 py-3 space-y-1.5'>
						<div className='relative'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
							<input
								type='text'
								placeholder='Cari di anggota workspace...'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								autoFocus
								className='w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500'
							/>
						</div>
						<p className='text-[11px] text-slate-400 px-0.5'>
							Hanya rekan di workspace ini (bukan seluruh akun server).
						</p>
					</div>
					<div className='flex-1 overflow-y-auto px-4 pb-4 space-y-1'>
						{wsMembersStatus === "loading" && (
							<p className='text-xs text-slate-400 text-center py-6'>
								Memuat anggota workspace...
							</p>
						)}
						{wsMembersStatus === "succeeded" && addCandidates.length === 0 && (
							<p className='text-xs text-slate-400 text-center py-6'>
								Tidak ada anggota workspace yang cocok
							</p>
						)}
						{addCandidates.map((u) => {
							const already = memberIds.has(u.id);
							const isMe = u.id === user?.id;
							if (isMe) return null;
							return (
								<button
									key={u.id}
									disabled={already || addingId === u.id}
									onClick={() => !already && handleAddMember(u)}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
										already ?
											"opacity-50 cursor-not-allowed bg-slate-50"
										:	"hover:bg-indigo-50 cursor-pointer"
									}`}
								>
									<Avatar
										name={u.username || u.email}
										size='sm'
										online={u.is_online}
									/>
									<div className='flex-1 text-left min-w-0'>
										<p className='text-sm font-medium text-slate-800 truncate'>
											{u.username || u.email}
										</p>
										{u.department && !already && (
											<p className='text-xs text-indigo-600 truncate'>{u.department}</p>
										)}
										{already && (
											<p className='text-xs text-slate-400'>Sudah anggota</p>
										)}
									</div>
									{addingId === u.id ?
										<div className='w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0' />
									: already ?
										<Check className='w-4 h-4 text-slate-400 flex-shrink-0' />
									:	<UserPlus className='w-4 h-4 text-indigo-500 flex-shrink-0' />
									}
								</button>
							);
						})}
					</div>
				</div>
			:	/* Main Info Panel */
				<div className='flex-1 overflow-y-auto scrollbar-light'>
					{/* Group Avatar & Name */}
					<div className='flex flex-col items-center py-8 px-4'>
						<div className='w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg'>
							<Users className='w-10 h-10 text-white' />
						</div>
						<h2 className='text-lg font-bold text-slate-900 text-center'>
							{group.name}
						</h2>
						<p className='text-sm text-slate-500 mt-1'>
							{group.members?.length} anggota
						</p>
						{group.description && (
							<p className='text-sm text-slate-600 mt-3 text-center leading-relaxed px-4 py-3 bg-slate-50 rounded-xl w-full'>
								{group.description}
							</p>
						)}
						<p className='text-xs text-slate-400 mt-3'>
							Dibuat{" "}
							{group.createdAt ?
								new Date(group.createdAt).toLocaleDateString("id-ID", {
									day: "numeric",
									month: "long",
									year: "numeric",
								})
							:	"-"}
						</p>
					</div>

					{/* Members */}
					<div className='px-4 pb-4'>
						<div className='flex items-center justify-between mb-3'>
							<h4 className='text-sm font-semibold text-slate-700'>
								Anggota ({group.members?.length})
							</h4>
							{isAdmin && (
								<button
									onClick={() => setShowAddPanel(true)}
									className='flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors'
								>
									<UserPlus className='w-3.5 h-3.5' />
									Tambah
								</button>
							)}
						</div>

						<div className='space-y-1'>
							{group.members?.map((member) => (
								<div
									key={member.id}
									className='flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors'
								>
									<Avatar name={member.name} size='sm' online={onlineUsers.includes(member.id)} />
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-medium text-slate-800 truncate'>
											{member.name}
											{member.id === user?.id && (
												<span className='text-xs text-slate-400 ml-1'>
													(Kamu)
												</span>
											)}
										</p>
										{member.department && (
											<p className='text-xs text-indigo-600 truncate'>{member.department}</p>
										)}
									</div>
									{member.role === "admin" && (
										<span className='flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0'>
											<Crown className='w-3 h-3' />
											Admin
										</span>
									)}
									{isAdmin && member.id !== user?.id && (
										<button
											onClick={() => handleRoleToggle(member)}
											disabled={!!roleLoading[member.id]}
											className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 transition-colors ${
												member.role === "admin" ?
													"border-slate-300 text-slate-600 hover:bg-slate-100"
												:	"border-indigo-300 text-indigo-600 hover:bg-indigo-50"
											} disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											{roleLoading[member.id] ?
												"..."
											: member.role === "admin" ?
												"Turunkan"
											:	"Jadikan Admin"}
										</button>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			}

			{/* Actions */}
			{!showAddPanel && (
				<div className='p-4 border-t border-slate-100 space-y-2'>
					{isAdmin && (
						<Button
							variant='secondary'
							fullWidth
							size='sm'
							className='text-slate-700'
							onClick={() => setShowAddPanel(true)}
						>
							<UserPlus className='w-4 h-4' />
							Tambah Anggota
						</Button>
					)}
					<Button
						variant='danger'
						fullWidth
						size='sm'
						onClick={handleLeaveClick}
						loading={leaving}
					>
						<LogOut className='w-4 h-4' />
						Keluar Grup
					</Button>
					{isAdmin && (
						<Button
							variant='danger'
							fullWidth
							size='sm'
							onClick={handleDeleteClick}
							loading={deleting}
						>
							<Trash2 className='w-4 h-4' />
							Hapus Grup
						</Button>
					)}
				</div>
			)}

			<ConfirmModal
				isOpen={!!confirm}
				onClose={() => setConfirm(null)}
				onConfirm={confirm?.type === "leave" ? handleLeave : handleDelete}
				title={confirm?.title}
				message={confirm?.message}
				loading={confirm?.type === "leave" ? leaving : deleting}
			/>
		</div>
	);
};

export default GroupInfo;
