import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import MainShell from "../components/layout/MainShell";
import Header from "../components/layout/Header";
import MessageBubble from "../components/chat/MessageBubble";
import ThreadPanel from "../components/chat/ThreadPanel";
import MessageInput from "../components/chat/MessageInput";
import GroupInfo from "../components/group/GroupInfo";
import MediaGallery from "../components/chat/MediaGallery";
import CallEventBubble from "../components/chat/CallEventBubble";
import {
	ChatTypingIndicatorWithName,
	ChatDateDivider,
} from "../components/chat/ChatThreadUi";
import { useGroupChatRoom } from "../hooks/useGroupChatRoom";
import { useChatPolls } from "../hooks/useChatPolls";
import { useAppDispatch } from "../store/index";
import { toggleSidebar } from "../store/uiSlice";
import { Phone, Video, Pin, X } from "lucide-react";
import { messageService } from "../services/messageService";
import PollBubble from "../components/chat/PollBubble";

const GroupChatPage = () => {
	const { groupId } = useParams();
	const dispatch = useAppDispatch();
	const g = useGroupChatRoom(groupId);
	const [activeThread, setActiveThread] = useState(null);
	const { polls, addPoll } = useChatPolls(Number(groupId), g.on);
	// localReactions: WS/user updates keyed by message id
	const [localReactions, setLocalReactions] = useState({});
	const reactionsRef = useRef({});

	// Merge API seed (from groupedMessages) with local updates — no setState in effects
	const reactions = useMemo(() => {
		const seed = {};
		if (g.groupedMessages && !g.loading) {
			for (const item of g.groupedMessages) {
				if (
					item.type === "message" &&
					Array.isArray(item.reactions) &&
					item.reactions.length > 0
				) {
					seed[item.id] = item.reactions;
				}
			}
		}
		return { ...seed, ...localReactions };
	}, [g.groupedMessages, g.loading, localReactions]);

	useEffect(() => {
		reactionsRef.current = reactions;
	}, [reactions]);

	const { on: socketOn } = g;
	// WS reaction events — counts from other users (reacted_by_me not included, keep existing)
	useEffect(() => {
		if (!socketOn) return;
		return socketOn("reaction_updated", (ev) => {
			if (ev.message_id && Array.isArray(ev.reactions)) {
				setLocalReactions((prev) => {
					const existing = reactionsRef.current[ev.message_id] || [];
					const merged = ev.reactions.map((r) => {
						const found = existing.find((e) => e.emoji === r.emoji);
						return { ...r, reacted_by_me: found?.reacted_by_me ?? false };
					});
					return { ...prev, [ev.message_id]: merged };
				});
			}
		});
	}, [socketOn]);

	const handleReact = useCallback(async (msgId, emoji, alreadyReacted) => {
		try {
			// If adding a new emoji and user already has a different reaction, change it
			if (!alreadyReacted) {
				const currentRxns = reactionsRef.current[msgId] || [];
				const existingReaction = currentRxns.find((r) => r.reacted_by_me);
				if (existingReaction && existingReaction.emoji !== emoji) {
					await messageService.removeReaction(msgId, existingReaction.emoji);
				}
			}
			const res = alreadyReacted
				? await messageService.removeReaction(msgId, emoji)
				: await messageService.addReaction(msgId, emoji);
			const updated = res.data?.data;
			if (Array.isArray(updated)) {
				setLocalReactions((prev) => ({ ...prev, [msgId]: updated }));
			}
		} catch {
			// ignore
		}
	}, []);

	if (g.loading) {
		return (
			<MainShell showBottomNav={false}>
				<div className='flex flex-1 items-center justify-center'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent' />
				</div>
			</MainShell>
		);
	}

	if (!g.room) return null;

	const {
		room,
		user,
		members,
		memberMap,
		showInfo,
		setShowInfo,
		showGallery,
		setShowGallery,
		pinnedMessage,
		replyTo,
		setReplyTo,
		bookmarkedIds,
		typingUser,
		ongoingCalls,
		startCall,
		callHistory,
		messagesEndRef,
		groupedMessages,
		shouldShowAvatar,
		groupForInfo,
		handleSend,
		handleTyping,
		handleDelete,
		handlePin,
		handleBookmark,
		scrollToPinnedMessage,
		updateMembersFromGroupInfo,
	} = g;

	return (
		<MainShell showBottomNav={false}>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
				<Header
					name={room.name || "Grup"}
					avatar={null}
					memberCount={members.length}
					showInfo
					onOpenSidebar={() => dispatch(toggleSidebar())}
					onInfo={() => setShowInfo(!showInfo)}
					onGallery={() => setShowGallery(true)}
					kanbanPath={`/group/${groupId}/kanban`}
				/>
				{pinnedMessage && (
					<div className='flex items-center gap-2 border-b border-amber-200/60 bg-amber-50/95 px-4 py-2'>
						<Pin
							className='h-3.5 w-3.5 flex-shrink-0 text-amber-500'
							aria-hidden
						/>
						<button
							type='button'
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
				{ongoingCalls[Number(groupId)] && (
					<div className='flex items-center justify-between gap-3 border-b border-emerald-200/60 bg-emerald-50/95 px-4 py-2'>
						<div className='flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-800'>
							{ongoingCalls[Number(groupId)] === "video" ? (
								<Video className='h-4 w-4 shrink-0' />
							) : (
								<Phone className='h-4 w-4 shrink-0' />
							)}
							<span className='truncate'>
								{ongoingCalls[Number(groupId)] === "video"
									? "Video call"
									: "Voice call"}{" "}
								sedang berlangsung
							</span>
						</div>
						<button
							type='button'
							onClick={() =>
								startCall(Number(groupId), ongoingCalls[Number(groupId)])
							}
							className='shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-clean transition-colors hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2'
						>
							Gabung
						</button>
					</div>
				)}
				<div className='flex min-h-0 flex-1 overflow-hidden'>
					<div className='flex min-w-0 flex-1 flex-col'>
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
												senderName={item.senderName}
												isGroup
												onReply={setReplyTo}
												onDelete={handleDelete}
												onPin={handlePin}
												pinnedMessageId={pinnedMessage?.id}
												onBookmark={handleBookmark}
												bookmarkedIds={bookmarkedIds}
												onOpenThread={setActiveThread}
												reactions={reactions[item.id] || []}
												onReact={handleReact}
												currentUserId={g.user?.id}
											/>
										</div>
									);
								})}
								{(callHistory[Number(groupId)] || []).map((ev) => (
									<CallEventBubble
										key={ev.id}
										event={{
											...ev,
											callerName:
												ev.callType === "call_started"
													? memberMap[ev.from] || `User ${ev.from}`
													: "",
										}}
									/>
								))}
								{polls.length > 0 && (
									<div className="flex flex-col gap-3 px-4 py-2">
										{polls.map((poll) => (
											<PollBubble
												key={poll.id}
												poll={poll}
												currentUserId={user?.id}
												isOwn={poll.created_by_id === user?.id}
											/>
										))}
									</div>
								)}
								{typingUser && (
									<ChatTypingIndicatorWithName name={typingUser} />
								)}
								<div ref={messagesEndRef} />
							</div>
						</div>
						<MessageInput
							onSend={handleSend}
							onTyping={handleTyping}
							replyTo={replyTo}
							onCancelReply={() => setReplyTo(null)}
							roomId={Number(groupId)}
							onPollCreated={addPoll}
						/>
						{activeThread && (
							<ThreadPanel
								parentMessage={activeThread}
								currentUser={user}
								onClose={() => setActiveThread(null)}
								onSendReply={(text, replyToId) =>
									handleSend(text, null, { id: replyToId })
								}
							/>
						)}
					</div>
					{showInfo && (
						<GroupInfo
							group={groupForInfo}
							onClose={() => setShowInfo(false)}
							onMembersUpdated={updateMembersFromGroupInfo}
						/>
					)}
				</div>
			</div>
			{showGallery && (
				<MediaGallery
					key={groupId}
					onClose={() => setShowGallery(false)}
				/>
			)}
		</MainShell>
	);
};

export default GroupChatPage;
