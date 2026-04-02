import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, MessageCircle, ClipboardList, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/index";
import { setSidebarOpen } from "../../store/uiSlice";
import { selectAllRooms } from "../../store/roomsSlice";
import { focusRing } from "../../lib/uiClasses";

const navBtnBase =
	`flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${focusRing} rounded-xl`;

/**
 * Tab bar khusus mobile (disembunyikan di lg+). Sidebar desktop tidak berubah.
 */
export default function MobileBottomNav() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const dispatch = useAppDispatch();
	const rooms = useAppSelector(selectAllRooms);
	const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
	const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

	const isHome = pathname === "/dashboard";
	const isChats =
		pathname.startsWith("/chat/") ||
		pathname.startsWith("/group/") ||
		sidebarOpen;
	const isTasks = pathname === "/tasks";
	const isProfile =
		pathname === "/profile" || pathname === "/change-password";

	const goHome = () => {
		dispatch(setSidebarOpen(false));
		if (pathname !== "/dashboard") navigate("/dashboard");
	};
	const openChats = () => {
		dispatch(setSidebarOpen(true));
	};
	const goTasks = () => {
		dispatch(setSidebarOpen(false));
		if (pathname !== "/tasks") navigate("/tasks");
	};
	const goProfile = () => {
		dispatch(setSidebarOpen(false));
		if (pathname !== "/profile") navigate("/profile");
	};

	return (
		<nav
			className='fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-md lg:hidden'
			aria-label='Navigasi utama'
		>
			<div className='mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1'>
				<button
					type='button'
					onClick={goHome}
					aria-current={isHome ? "page" : undefined}
					className={`${navBtnBase} ${
						isHome ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
					}`}
				>
					<LayoutDashboard className='h-5 w-5 shrink-0' aria-hidden='true' />
					Beranda
				</button>

				<button
					type='button'
					onClick={openChats}
					aria-current={isChats ? "page" : undefined}
					className={`relative ${navBtnBase} ${
						isChats ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
					}`}
				>
					<span className='relative inline-flex'>
						<MessageCircle className='h-5 w-5 shrink-0' aria-hidden='true' />
						{totalUnread > 0 && (
							<span className='absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white'>
								{totalUnread > 99 ? "99+" : totalUnread}
							</span>
						)}
					</span>
					Chat
				</button>

				<button
					type='button'
					onClick={goTasks}
					aria-current={isTasks ? "page" : undefined}
					className={`${navBtnBase} ${
						isTasks ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
					}`}
				>
					<ClipboardList className='h-5 w-5 shrink-0' aria-hidden='true' />
					Task
				</button>

				<button
					type='button'
					onClick={goProfile}
					aria-current={isProfile ? "page" : undefined}
					className={`${navBtnBase} ${
						isProfile ?
							"text-indigo-600"
						:	"text-slate-500 hover:text-slate-800"
					}`}
				>
					<User className='h-5 w-5 shrink-0' aria-hidden='true' />
					Saya
				</button>
			</div>
			<div className='h-[env(safe-area-inset-bottom)] min-h-[env(safe-area-inset-bottom)]' aria-hidden='true' />
		</nav>
	);
}
