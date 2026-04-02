import { useParams } from "react-router-dom";
import MainShell from "../components/layout/MainShell";
import Header from "../components/layout/Header";
import MessageBubble from "../components/chat/MessageBubble";
import MessageInput from "../components/chat/MessageInput";
import ConfirmModal from "../components/ui/ConfirmModal";
import CallEventBubble from "../components/chat/CallEventBubble";
import MediaGallery from "../components/chat/MediaGallery";
import {
	ChatTypingIndicator,
	ChatDateDivider,
} from "../components/chat/ChatThreadUi";
import { useDirectChatRoom } from "../hooks/useDirectChatRoom";
import { useAppDispatch } from "../store/index";
import { toggleSidebar } from "../store/uiSlice";
import { Phone, Video, Pin, X } from "lucide-react";

const ChatPage = () => {
	const { roomId } = useParams();
	const dispatch = useAppDispatch();
	const chat = useDirectChatRoom(roomId);

	if (chat.loading) {
		return (
			<MainShell showBottomNav={false}>
				<div className='flex flex-1 items-center justify-center'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent' />
				</div>
			</MainShell>
		);
	}

	if (chat.error) {
		return (
			<MainShell showBottomNav={false}>
				<div className='flex flex-1 items-center justify-center px-4'>
					<p className='text-center text-slate-500'>{chat.error}</p>
				</div>
			</MainShell>
		);
	}

	const {
		contact,
		contactName,
		isOnline,
		user,
		isConnected,
		replyTo,
		setReplyTo,
		showGallery,
		setShowGallery,
		pinnedMessage,
		pinnedMsgRef,
		bookmarkedIds,
		ongoingCalls,
		startCall,
		callHistory,
		messagesEndRef,
		handleSend,
		handleTyping,
		handleDelete,
		handleBookmark,
		handlePin,
		handleDeleteRoom,
		doDeleteRoom,
		showDeleteConfirm,
		setShowDeleteConfirm,
		groupedMessages,
		shouldShowAvatar,
		isTyping,
		scrollToPinnedMessage,
	} = chat;

	return (
		<MainShell showBottomNav={false}>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
				<Header
					name={contactName}
					status={isOnline ? "online" : "offline"}
					avatar={contact?.avatar}
					onOpenSidebar={() => dispatch(toggleSidebar())}
					onDelete={handleDeleteRoom}
					onGallery={() => setShowGallery(true)}
					roomId={Number(roomId)}
				/>
				{!isConnected && (
					<div className='border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-600'>
						Menghubungkan ke server...
					</div>
				)}
				{pinnedMessage && (
					<div className='flex items-center gap-2 border-b border-amber-200/60 bg-amber-50/95 px-4 py-2'>
						<Pin
							className='h-3.5 w-3.5 flex-shrink-0 text-amber-500'
							aria-hidden
						/>
						<button
							type='button'
							ref={pinnedMsgRef}
							className='min-w-0 flex-1 truncate rounded-lg py-1 text-left text-xs text-amber-900 hover:bg-amber-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 focus-visible:ring-offset-amber-50'
							onClick={scrollToPinnedMessage}
						>
							<span className='font-semibold'>Pesan disematkan: </span>
							{pinnedMessage.body || ""}
						</button>
						<button
							type='button'
							onClick={() => handlePin(null)}
							aria-label='Hapus sematan'
							className='flex min-h-9 min-w-9 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
						>
							<X className='h-3.5 w-3.5' />
						</button>
					</div>
				)}
				{ongoingCalls[Number(roomId)] && (
					<div className='flex items-center justify-between gap-3 border-b border-emerald-200/60 bg-emerald-50/95 px-4 py-2'>
						<div className='flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-800'>
							{ongoingCalls[Number(roomId)] === "video" ?
								<Video className='h-4 w-4 shrink-0' />
							:	<Phone className='h-4 w-4 shrink-0' />}
							<span className='truncate'>
								{ongoingCalls[Number(roomId)] === "video" ?
									"Video call"
								:	"Voice call"}{" "}
								sedang berlangsung
							</span>
						</div>
						<button
							type='button'
							onClick={() =>
								startCall(Number(roomId), ongoingCalls[Number(roomId)])
							}
							className='shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-clean transition-colors hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2'
						>
							Gabung
						</button>
					</div>
				)}
				<div className='flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4'>
					<div className='mx-auto max-w-2xl space-y-0.5'>
						{groupedMessages.map((item) => {
							if (item.type === "divider")
								return <ChatDateDivider key={item.id} date={item.date} />;
							const isOwn = Number(item.senderId) === Number(user?.id);
							return (
								<div key={item.id} id={`msg-${item.id}`}>
									<MessageBubble
										message={item}
										isOwn={isOwn}
										showAvatar={!isOwn && shouldShowAvatar(item)}
										senderName={contactName}
										onReply={setReplyTo}
										onDelete={handleDelete}
										onPin={handlePin}
										pinnedMessageId={pinnedMessage?.id}
										onBookmark={handleBookmark}
										bookmarkedIds={bookmarkedIds}
									/>
									{isOwn && item.showRead && (
										<div className='-mt-1 mb-1 flex justify-end pr-2'>
											<span className='text-xs font-medium text-indigo-500'>
												Dibaca
											</span>
										</div>
									)}
								</div>
							);
						})}
						{(callHistory[Number(roomId)] || []).map((ev) => (
							<CallEventBubble
								key={ev.id}
								event={{
									...ev,
									callerName:
										ev.callType === "call_started" ?
											Number(ev.from) === Number(user?.id) ?
												user?.username || "Kamu"
											:	contact?.username || contact?.email || "Pengguna"
										:	"",
								}}
							/>
						))}
						{isTyping && <ChatTypingIndicator />}
						<div ref={messagesEndRef} />
					</div>
				</div>
				<MessageInput
					onSend={handleSend}
					onTyping={handleTyping}
					replyTo={replyTo}
					onCancelReply={() => setReplyTo(null)}
					roomId={Number(roomId)}
				/>
			</div>
			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={doDeleteRoom}
				title='Hapus Percakapan'
				message='Hapus percakapan ini? Semua pesan akan dihapus permanen.'
			/>
			{showGallery && (
				<MediaGallery
					key={roomId}
					roomId={Number(roomId)}
					onClose={() => setShowGallery(false)}
				/>
			)}
		</MainShell>
	);
};

export default ChatPage;
