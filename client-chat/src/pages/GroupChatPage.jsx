import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import GroupInfo from '../components/group/GroupInfo';
import { formatDateDivider } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useAppDispatch, useAppSelector } from '../store/index';
import { fetchRoomById, selectRoomById, markRoomRead } from '../store/roomsSlice';
import { fetchMessages, selectMessagesByRoom, addOptimisticMessage } from '../store/messagesSlice';
import { messageService } from '../services/messageService';
import CallEventBubble from '../components/chat/CallEventBubble';
import { useCall } from '../context/CallContext';
import { Phone, Video } from 'lucide-react';

const TypingIndicator = ({ name }) => (
  <div className="flex items-end gap-2 mb-2">
    <div className="w-8 h-8 flex-shrink-0" />
    <div className="flex flex-col">
      {name && <span className="text-xs text-indigo-600 mb-1 ml-1">{name}</span>}
      <div className="bg-white border border-slate-100 shadow-sm rounded-tr-2xl rounded-br-2xl rounded-tl-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

const DateDivider = ({ date }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-slate-200" />
    <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-100 rounded-full">
      {formatDateDivider(date)}
    </span>
    <div className="flex-1 h-px bg-slate-200" />
  </div>
);

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { ongoingCalls, startCall, callHistory } = useCall();
  const { connectToRoom, disconnectRoom, sendMessage, emitTyping, emitStopTyping, emitRead, on, isConnected } = useSocket();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [showInfo, setShowInfo] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);

  const room = useAppSelector((s) => selectRoomById(s, Number(groupId)));
  const rawMessages = useAppSelector((s) => selectMessagesByRoom(s, groupId));

  // Members stored locally from fetch result — avoids conflict with ChatPage's activeRoomMembers
  const [members, setMembers] = useState([]);

  // Map userId → displayName
  const memberMap = Object.fromEntries(
    members.map((m) => [m.id, m.username || m.email || `User ${m.id}`])
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const init = async () => {
      try {
        const [roomResult] = await Promise.all([
          dispatch(fetchRoomById(Number(groupId))),
          dispatch(fetchMessages({ roomId: Number(groupId) })),
        ]);
        if (cancelled) return;
        // Store members locally to avoid conflict with ChatPage's activeRoomMembers
        if (roomResult.payload?.members) {
          setMembers(roomResult.payload.members);
        }
        connectToRoom(Number(groupId));
        dispatch(markRoomRead(Number(groupId)));
      } catch {
        if (!cancelled) navigate('/dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      disconnectRoom();
      document.title = 'Zync';
    };
  }, [groupId, connectToRoom, disconnectRoom, dispatch, navigate]);

  useEffect(() => {
    if (room) document.title = `${room.name || 'Grup'} — Zync`;
  }, [room]);

  // Read receipt on incoming messages
  useEffect(() => {
    return on('chat', (msg) => {
      if (msg.from !== user?.id) emitRead(msg.id);
    });
  }, [on, user, emitRead]);

  // When WS connects, emit read for the latest unread message to persist to server
  useEffect(() => {
    if (!isConnected || rawMessages.length === 0) return;
    const last = [...rawMessages].reverse().find((m) => Number(m.sender_id) !== Number(user?.id) && !m.optimistic);
    if (last?.id) emitRead(last.id);
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Typing listeners
  useEffect(() => {
    const unsubTyping = on('typing', ({ userId }) => {
      setTypingUser(memberMap[userId] || null);
    });
    const unsubStop = on('stop_typing', () => setTypingUser(null));
    return () => { unsubTyping(); unsubStop(); };
  }, [on, memberMap]);

  // Auto-navigate away when the group is deleted
  useEffect(() => {
    return on('room_deleted', ({ roomId }) => {
      if (Number(roomId) === Number(groupId)) navigate('/dashboard');
    });
  }, [on, groupId, navigate]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawMessages, typingUser]);

  const handleSend = useCallback((text, _file, reply) => {
    if (!text || !groupId) return;
    dispatch(addOptimisticMessage({
      roomId: Number(groupId),
      senderId: user?.id,
      body: text,
      replyToId: reply?.id ?? null,
    }));
    sendMessage(text, reply?.id);
    setReplyTo(null);
  }, [sendMessage, dispatch, groupId, user]);

  const handleTyping = useCallback((typing) => {
    if (typing) {
      emitTyping();
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(emitStopTyping, 3000);
    } else {
      emitStopTyping();
      clearTimeout(typingTimerRef.current);
    }
  }, [emitTyping, emitStopTyping]);

  const handleDelete = useCallback(async (msgId) => {
    try {
      await messageService.delete(msgId);
    } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Normalize messages for display
  const messages = rawMessages.map((m) => ({
    id: m.id,
    senderId: m.sender_id ?? m.from,
    senderName: memberMap[m.sender_id ?? m.from] || `User ${m.sender_id ?? m.from}`,
    text: m.body ?? m.text ?? '',
    timestamp: m.created_at ? new Date(m.created_at) : new Date(m.sent_at * 1000),
    read: true,
    replyTo: m.reply_to_id ? { id: m.reply_to_id } : null,
    deleted: m.is_deleted,
    edited: !!m.edited_at,
  }));

  const groupedMessages = messages.reduce((groups, msg, i) => {
    const msgDate = new Date(msg.timestamp).toDateString();
    const prevDate = i > 0 ? new Date(messages[i - 1].timestamp).toDateString() : null;
    if (msgDate !== prevDate) {
      groups.push({ type: 'divider', date: msg.timestamp, id: `divider_${i}` });
    }
    groups.push({ type: 'message', ...msg });
    return groups;
  }, []);

  const msgItems = groupedMessages.filter((g) => g.type === 'message');
  const shouldShowAvatar = (item) => {
    const idx = msgItems.findIndex((m) => m.id === item.id);
    if (idx < 0) return false;
    const next = msgItems[idx + 1];
    return !next || next.senderId !== item.senderId;
  };

  const groupForInfo = {
    ...room,
    members: members.map((m) => ({
      id: m.id,
      name: m.username || m.email,
      role: m.role || 'member',
    })),
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          name={room.name || 'Grup'}
          avatar={null}
          memberCount={members.length}
          showInfo
          onInfo={() => setShowInfo(!showInfo)}
          kanbanPath={`/group/${groupId}/kanban`}
          roomId={Number(groupId)}
        />
        {ongoingCalls[Number(groupId)] && (
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              {ongoingCalls[Number(groupId)] === 'video'
                ? <Video className="w-4 h-4" />
                : <Phone className="w-4 h-4" />}
              {ongoingCalls[Number(groupId)] === 'video' ? 'Video call' : 'Voice call'} sedang berlangsung
            </div>
            <button
              onClick={() => startCall(Number(groupId), ongoingCalls[Number(groupId)])}
              className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full transition-colors"
            >
              Gabung
            </button>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-slate-50 to-white">
              <div className="max-w-2xl mx-auto space-y-0.5">
                {groupedMessages.map((item) => {
                  if (item.type === 'divider') return <DateDivider key={item.id} date={item.date} />;
                  const isOwn = Number(item.senderId) === Number(user?.id);
                  return (
                    <MessageBubble
                      key={item.id}
                      message={item}
                      isOwn={isOwn}
                      showAvatar={!isOwn && shouldShowAvatar(item)}
                      senderName={item.senderName}
                      isGroup
                      onReply={setReplyTo}
                      onDelete={handleDelete}
                    />
                  );
                })}
                {(callHistory[Number(groupId)] || []).map((ev) => (
                  <CallEventBubble
                    key={ev.id}
                    event={{
                      ...ev,
                      callerName: ev.callType === 'call_started'
                        ? (memberMap[ev.from] || `User ${ev.from}`)
                        : '',
                    }}
                  />
                ))}
                {typingUser && <TypingIndicator name={typingUser} />}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <MessageInput
              onSend={handleSend}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              roomId={Number(groupId)}
            />
          </div>
          {showInfo && (
            <GroupInfo
              group={groupForInfo}
              onClose={() => setShowInfo(false)}
              onMembersUpdated={(newMembers) => setMembers(
                newMembers.map((m) => ({
                  id: m.id,
                  username: m.name || m.username,
                  email: m.email,
                  role: m.role || 'member',
                }))
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupChatPage;
