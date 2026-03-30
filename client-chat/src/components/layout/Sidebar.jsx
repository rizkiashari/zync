import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Search,
	Plus,
	Settings,
	Users,
	Wifi,
	WifiOff,
	MessageSquare,
	ClipboardList,
	Building2,
} from "lucide-react";
import Logo from "../ui/Logo";
import Avatar from "../ui/Avatar";
import ChatList from "../chat/ChatList";
import CreateGroupModal from "../group/CreateGroupModal";
import NewChatModal from "../chat/NewChatModal";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useAppDispatch, useAppSelector } from "../../store/index";
import { fetchRooms, selectAllRooms } from "../../store/roomsSlice";
import { openCreateGroup, closeCreateGroup } from "../../store/uiSlice";
import { useBranding } from "../../hooks/useBranding";

const Sidebar = () => {
	const { user } = useAuth();
	const { isConnected } = useSocket();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const dispatch = useAppDispatch();
	const rooms = useAppSelector(selectAllRooms);
	const showCreateGroup = useAppSelector((s) => s.ui.showCreateGroup);
	const { displayName, primaryColor, logoURL } = useBranding();
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");
	const [showNewMenu, setShowNewMenu] = useState(false);
	const [showNewChat, setShowNewChat] = useState(false);

	useEffect(() => {
		dispatch(fetchRooms());
	}, [dispatch]);

	const tabs = [
		{ id: "all", label: "Semua" },
		{ id: "messages", label: "Pesan" },
		{ id: "groups", label: "Grup" },
	];

	const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

	return (
		<>
			<div className='w-80 flex-shrink-0 bg-slate-900 flex flex-col h-full border-r border-slate-800'>
				{/* Brand */}
				<div className='px-4 pt-5 pb-3'>
					<div className='flex items-center justify-between'>
						<button
							onClick={() => navigate("/dashboard")}
							className='flex items-center gap-2.5 hover:opacity-80 transition-opacity'
						>
							<div
								className='w-8 h-8 rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0'
								style={{ backgroundColor: primaryColor }}
							>
								{logoURL ? (
									<img src={logoURL} alt='logo' className='w-full h-full object-cover' />
								) : (
									<Logo size={18} variant='white' />
								)}
							</div>
							<div>
								<span className='text-white font-bold text-lg leading-none'>
									{displayName}
								</span>
								{totalUnread > 0 && (
									<p className='text-xs text-indigo-400'>
										{totalUnread} belum dibaca
									</p>
								)}
							</div>
						</button>

						<div className='flex items-center gap-2'>
							<div
								title={isConnected ? "Terhubung" : "Tidak terhubung"}
								className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
									isConnected ?
										"bg-emerald-900/40 text-emerald-400"
									:	"bg-slate-700/60 text-slate-500"
								}`}
							>
								{isConnected ?
									<Wifi className='w-3 h-3' />
								:	<WifiOff className='w-3 h-3' />}
							</div>

							<div className='relative'>
								<button
									onClick={() => setShowNewMenu(!showNewMenu)}
									className='w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all duration-200 shadow-sm hover:opacity-90'
									style={{ backgroundColor: primaryColor }}
								>
									<Plus className='w-4 h-4' />
								</button>
								{showNewMenu && (
									<>
										<div
											className='fixed inset-0 z-30'
											onClick={() => setShowNewMenu(false)}
										/>
										<div className='absolute right-0 top-10 z-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-48'>
											<button
												onClick={() => {
													setShowNewMenu(false);
													setShowNewChat(true);
												}}
												className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors'
											>
												<MessageSquare className='w-4 h-4 text-indigo-600' />
												Chat Baru
											</button>
											<button
												onClick={() => {
													setShowNewMenu(false);
													dispatch(openCreateGroup());
												}}
												className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors'
											>
												<Users className='w-4 h-4 text-indigo-600' />
												Buat Grup
											</button>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Search */}
				<div className='px-4 pb-3'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' />
						<input
							type='text'
							placeholder='Cari percakapan...'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className='w-full pl-9 pr-4 py-2 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700 focus:border-transparent transition-all'
						/>
					</div>
				</div>

				{/* Tabs */}
				<div className='px-4 pb-3'>
					<div className='flex bg-slate-800 rounded-xl p-1 gap-1'>
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
									activeTab === tab.id ?
										"bg-indigo-600 text-white shadow-sm"
									:	"text-slate-400 hover:text-slate-200"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				<div className='px-4 pb-3'>
					<button
						type='button'
						onClick={() => navigate("/tasks")}
						className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
							pathname === "/tasks" ?
								"bg-indigo-600 text-white shadow-md"
							:	"bg-slate-800 text-slate-300 hover:bg-slate-700/80 border border-slate-700/80"
						}`}
					>
						<ClipboardList className='w-4 h-4 flex-shrink-0 opacity-90' />
						Task
					</button>
				</div>

				<ChatList rooms={rooms} activeTab={activeTab} searchQuery={search} />

				{/* Bottom: User Profile */}
				<div className='border-t border-slate-800 p-3'>
					<div className='flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors group'>
						<Avatar
							name={user?.username || user?.name}
							avatar={user?.avatar}
							size='md'
							online={true}
						/>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-medium text-slate-100 truncate'>
								{user?.username || user?.name || user?.email}
							</p>
							<p className='text-xs text-emerald-400'>Online</p>
						</div>
						<div className='flex items-center gap-1'>
							<button
								onClick={() => navigate("/workspace/settings")}
								className='p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors'
								title='Pengaturan Workspace'
							>
								<Building2 className='w-4 h-4' />
							</button>
							<button
								onClick={() => navigate("/profile")}
								className='p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors'
								title='Profil'
							>
								<Settings className='w-4 h-4' />
							</button>
						</div>
					</div>
				</div>
			</div>

			<CreateGroupModal
				isOpen={showCreateGroup}
				onClose={() => dispatch(closeCreateGroup())}
			/>

			<NewChatModal
				isOpen={showNewChat}
				onClose={() => setShowNewChat(false)}
			/>
		</>
	);
};

export default Sidebar;
