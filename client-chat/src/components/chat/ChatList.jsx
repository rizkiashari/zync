import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch } from "../../store/index";
import { setSidebarOpen } from "../../store/uiSlice";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { useSocket } from "../../context/SocketContext";
import { Users } from "lucide-react";
import { formatChatListTime } from "../../lib/chatTime";
import {
	chatListMessageSearchText,
	formatChatListMessagePreview,
} from "../../lib/messagePreview";

const ChatListItem = ({ room, isActive, onClick }) => {
	const { onlineUsers } = useSocket();
	const isGroup = room.type === "group";
	const unread = room.unread_count || 0;
	const displayName = room.name || (isGroup ? "Grup" : "Chat");
	const isOnline = onlineUsers.includes(room.id);

	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150
        ${
					isActive ?
						"bg-indigo-600/20 border border-indigo-500/30"
					:	"hover:bg-slate-700/50"
				}`}
		>
			<div className='relative flex-shrink-0'>
				{isGroup ?
					<div className='w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center'>
						<Users className='w-5 h-5 text-white' />
					</div>
				:	<Avatar name={displayName} size='md' online={isOnline} />}
			</div>
			<div className='flex-1 min-w-0 text-left'>
				<div className='flex items-center justify-between mb-0.5'>
					<span
						className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-slate-100"}`}
					>
						{displayName}
					</span>
					<span
						className={`text-xs flex-shrink-0 ml-2 ${unread > 0 ? "text-indigo-300" : "text-slate-500"}`}
					>
						{formatChatListTime(room.last_message_at, room.last_message)}
					</span>
				</div>
				<div className='flex items-center justify-between'>
					<p
						className={`text-xs truncate flex-1 ${unread > 0 ? "text-slate-300 font-medium" : "text-slate-500"}`}
					>
						{isGroup && room.member_count > 0 && (
							<span className='text-slate-400'>
								{room.member_count} anggota ·{" "}
							</span>
						)}
						{formatChatListMessagePreview(room.last_message) ||
							"Belum ada pesan"}
					</p>
					{unread > 0 && (
						<Badge count={unread} className='ml-2 flex-shrink-0' />
					)}
				</div>
			</div>
		</button>
	);
};

const ChatList = ({ rooms, activeTab, searchQuery }) => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const params = useParams();
	const activeGroupId = params.groupId ? Number(params.groupId) : null;
	const activeRoomId = params.roomId ? Number(params.roomId) : null;

	const allRooms = rooms || [];
	const filtered = allRooms.filter((r) => {
		const name = (r.name || "").toLowerCase();
		const msg = chatListMessageSearchText(r.last_message);
		const q = (searchQuery || "").toLowerCase();
		const matchesSearch = !q || name.includes(q) || msg.includes(q);
		const matchesTab =
			activeTab === "all" ||
			(activeTab === "messages" && r.type === "direct") ||
			(activeTab === "groups" && r.type === "group");
		return matchesSearch && matchesTab;
	});

	const directRooms = filtered.filter((r) => r.type === "direct");
	const groupRooms = filtered.filter((r) => r.type === "group");

	const handleClick = (room) => {
		dispatch(setSidebarOpen(false));
		if (room.type === "group") navigate(`/group/${room.id}`);
		else navigate(`/chat/${room.id}`);
	};

	const isActive = (room) => {
		if (room.type === "group") return activeGroupId === room.id;
		return activeRoomId === room.id;
	};

	return (
		<div className='flex-1 overflow-y-auto scrollbar-thin px-2 py-1 space-y-0.5'>
			{(activeTab === "all" || activeTab === "messages") &&
				directRooms.length > 0 && (
					<>
						{activeTab === "all" && (
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2'>
								Pesan
							</p>
						)}
						{directRooms.map((room) => (
							<ChatListItem
								key={room.id}
								room={room}
								isActive={isActive(room)}
								onClick={() => handleClick(room)}
							/>
						))}
					</>
				)}

			{(activeTab === "all" || activeTab === "groups") &&
				groupRooms.length > 0 && (
					<>
						{activeTab === "all" && directRooms.length > 0 && (
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mt-2'>
								Grup
							</p>
						)}
						{activeTab === "all" && directRooms.length === 0 && (
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2'>
								Grup
							</p>
						)}
						{groupRooms.map((room) => (
							<ChatListItem
								key={room.id}
								room={room}
								isActive={isActive(room)}
								onClick={() => handleClick(room)}
							/>
						))}
					</>
				)}

			{filtered.length === 0 && (
				<div className='flex flex-col items-center justify-center py-12 text-slate-500'>
					<p className='text-sm'>
						{searchQuery ? "Tidak ada hasil" : "Belum ada percakapan"}
					</p>
					{searchQuery && <p className='text-xs mt-1'>Coba kata kunci lain</p>}
				</div>
			)}
		</div>
	);
};

export default ChatList;
