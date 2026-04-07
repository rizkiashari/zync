import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { messageService } from '../services/messageService';

const messagesAdapter = createEntityAdapter();

const initialRoomState = () => messagesAdapter.getInitialState({ status: 'idle', hasMore: true, cursor: null });

// Negative IDs for optimistic messages (never conflict with server IDs)
let tempIdCounter = -1;

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ roomId, cursor }, { rejectWithValue }) => {
  try {
    const res = await messageService.list(roomId, cursor ? { before: cursor, limit: 40 } : { limit: 40 });
    return { roomId, messages: res.data.data || [] };
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to load messages');
  }
});

const messagesSlice = createSlice({
  name: 'messages',
  initialState: { byRoom: {}, status: 'idle', error: null },
  reducers: {
    // Add message immediately (optimistic, before WS echo)
    addOptimisticMessage(state, action) {
      const { roomId, senderId, body, replyToId } = action.payload;
      const rs = String(roomId);
      if (!state.byRoom[rs]) state.byRoom[rs] = initialRoomState();
      const tempId = tempIdCounter--;
      messagesAdapter.addOne(state.byRoom[rs], {
        id: tempId,
        room_id: roomId,
        sender_id: senderId,
        body,
        created_at: new Date().toISOString(),
        reply_to_id: replyToId ?? null,
        is_deleted: false,
        optimistic: true,
      });
    },

    // Called when WS echo arrives — removes matching optimistic + adds real message
    receiveWsMessage(state, action) {
      const msg = action.payload;
      const roomId = String(msg.room);
      if (!state.byRoom[roomId]) state.byRoom[roomId] = initialRoomState();

      // Remove optimistic message with same sender + body if exists
      const allIds = state.byRoom[roomId].ids;
      const optimisticId = allIds.find((id) => {
        if (typeof id === 'number' && id < 0) {
          const m = state.byRoom[roomId].entities[id];
          return m && m.sender_id === msg.from && m.body === msg.text;
        }
        return false;
      });
      if (optimisticId !== undefined) {
        messagesAdapter.removeOne(state.byRoom[roomId], optimisticId);
      }

      // Add real message (dedup by server ID)
      if (!state.byRoom[roomId].entities[msg.id]) {
        messagesAdapter.addOne(state.byRoom[roomId], normalizeMsg(msg));
      }
    },

    editMessageLocal(state, action) {
      const { id, body, roomId } = action.payload;
      const rs = state.byRoom[String(roomId)];
      if (rs) messagesAdapter.updateOne(rs, { id, changes: { body } });
    },
    deleteMessageLocal(state, action) {
      const { id, roomId } = action.payload;
      const rs = state.byRoom[String(roomId)];
      if (rs) messagesAdapter.updateOne(rs, { id, changes: { is_deleted: true, body: '' } });
    },
    clearRoomMessages(state, action) {
      delete state.byRoom[String(action.payload)];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const roomId = String(action.meta.arg.roomId);
        if (!state.byRoom[roomId]) state.byRoom[roomId] = initialRoomState();
        state.byRoom[roomId].status = 'loading';
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { roomId, messages } = action.payload;
        const rs = String(roomId);
        if (!state.byRoom[rs]) state.byRoom[rs] = initialRoomState();
        messagesAdapter.upsertMany(state.byRoom[rs], messages.map(normalizeMsg));
        state.byRoom[rs].status = 'succeeded';
        state.byRoom[rs].hasMore = messages.length >= 40;
        if (messages.length > 0) state.byRoom[rs].cursor = messages[0].id;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const roomId = String(action.meta.arg.roomId);
        if (state.byRoom[roomId]) state.byRoom[roomId].status = 'failed';
        state.error = action.payload;
      });
  },
});

function normalizeMsg(msg) {
  return {
    id: msg.id,
    room_id: msg.room_id ?? msg.room,
    sender_id: msg.sender_id ?? msg.from,
    body: msg.body ?? msg.text ?? '',
    created_at: msg.created_at ?? (msg.sent_at ? new Date(msg.sent_at * 1000).toISOString() : new Date().toISOString()),
    reply_to_id: msg.reply_to_id,
    is_deleted: msg.is_deleted ?? false,
    sender: msg.sender,
    reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
    optimistic: false,
  };
}

export const {
  addOptimisticMessage,
  receiveWsMessage: receiveWsMessageInMessages,
  editMessageLocal,
  deleteMessageLocal,
  clearRoomMessages,
} = messagesSlice.actions;

export const selectMessagesByRoom = (state, roomId) => {
  const rs = state.messages.byRoom[String(roomId)];
  if (!rs) return [];
  return messagesAdapter.getSelectors().selectAll(rs);
};

export const selectRoomMessagesStatus = (state, roomId) =>
  state.messages.byRoom[String(roomId)]?.status ?? 'idle';

export default messagesSlice.reducer;
