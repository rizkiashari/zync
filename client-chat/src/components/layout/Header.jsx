import {
	ArrowLeft,
	Menu,
	Phone,
	Video,
	Trash2,
	Info,
	Users,
	ClipboardList,
	FolderOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Avatar from "../ui/Avatar";
import { useCall } from "../../context/CallContext";
import { focusRing } from "../../lib/uiClasses";

const Header = ({
	name,
	status,
	avatar,
	onBack,
	onOpenSidebar,
	onInfo,
	showInfo = false,
	memberCount,
	onDelete,
	onGallery,
	kanbanPath,
	roomId,
}) => {
	const navigate = useNavigate();
	const isOnline = status === "online";
	const { startCall } = useCall();

	return (
		<header className='flex items-center justify-between px-3 sm:px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 flex-shrink-0 shadow-clean pt-[max(0.25rem,env(safe-area-inset-top))] lg:pt-3'>
			<div className='flex items-center gap-2 sm:gap-3 min-w-0'>
				{onOpenSidebar && (
					<button
						type='button'
						onClick={onOpenSidebar}
						aria-label='Buka daftar percakapan'
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex-shrink-0 lg:hidden ${focusRing}`}
					>
						<Menu className='w-5 h-5' aria-hidden='true' />
					</button>
				)}
				<button
					type='button'
					onClick={onBack ?? (() => navigate("/dashboard"))}
					aria-label='Kembali ke dashboard'
					className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex-shrink-0 lg:hidden ${focusRing}`}
				>
					<ArrowLeft className='w-5 h-5' />
				</button>

				{memberCount ?
					<div className='w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0'>
						<Users className='w-5 h-5 text-white' />
					</div>
				:	<Avatar name={name} avatar={avatar} size='md' online={isOnline} />}

				<div className='min-w-0'>
					<h2 className='text-sm font-semibold text-slate-900 truncate leading-tight'>
						{name}
					</h2>
					<p
						className={`text-xs truncate ${isOnline ? "text-emerald-500" : "text-slate-400"}`}
					>
						{memberCount ?
							`${memberCount} anggota`
						: isOnline ?
							"Online"
						:	"Terakhir dilihat baru-baru ini"}
					</p>
				</div>
			</div>

			<div className='flex items-center gap-0 flex-shrink-0 sm:gap-0.5'>
				{roomId && (
					<>
						<button
							type='button'
							onClick={() => startCall(roomId, "voice")}
							className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors ${focusRing}`}
							aria-label='Panggilan suara'
							title='Panggilan suara'
						>
							<Phone className='w-[18px] h-[18px]' />
						</button>
						<button
							type='button'
							onClick={() => startCall(roomId, "video")}
							className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ${focusRing}`}
							aria-label='Panggilan video'
							title='Panggilan video'
						>
							<Video className='w-[18px] h-[18px]' />
						</button>
					</>
				)}
				{onGallery && (
					<button
						type='button'
						onClick={onGallery}
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ${focusRing}`}
						aria-label='Galeri & File'
						title='Galeri & File'
					>
						<FolderOpen className='w-[18px] h-[18px]' />
					</button>
				)}
				{kanbanPath && (
					<button
						type='button'
						onClick={() => navigate(kanbanPath)}
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ${focusRing}`}
						aria-label='Buka board task'
						title='Track Task'
					>
						<ClipboardList className='w-[18px] h-[18px]' />
					</button>
				)}
				{showInfo && (
					<button
						type='button'
						onClick={onInfo}
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ${focusRing}`}
						aria-label='Info grup'
						title='Info grup'
					>
						<Info className='w-[18px] h-[18px]' />
					</button>
				)}
				{onDelete && (
					<button
						type='button'
						onClick={onDelete}
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ${focusRing}`}
						aria-label='Hapus percakapan'
						title='Hapus percakapan'
					>
						<Trash2 className='w-[18px] h-[18px]' />
					</button>
				)}
			</div>
		</header>
	);
};

export default Header;
