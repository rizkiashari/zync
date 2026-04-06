import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { roomService } from '../services/roomService';

const roomsAdapter = createEntityAdapter({
  sortComparer: (a, b) => {
    const aTime = a.last_message_at || a.updated_at || '';
    const bTime = b.last_message_at || b.updated_at || '';
    return bTime.localeCompare(aTime);
  },
});

export const fetchDashboard = createAsyncThunk('rooms/fetchDashboard', async (_, { rejectWithValue }) => {
  try {
    const res = await roomService.getDashboard();
    return res.data.data; // { stats, rooms, online_users }
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to load dashboard');
  }
});

export const fetchRooms = createAsyncThunk('rooms/fetchRooms', async (_, { rejectWithValue, getState }) => {
  try {
    const res = await roomService.list();
    const rooms = res.data.data || [];
    const currentUserId = Number(getState()?.auth?.user?.id);
    const directRooms = rooms.filter((room) => room?.type === 'direct');

    if (directRooms.length === 0 || !currentUserId) {
      return rooms;
    }

    const detailResults = await Promise.allSettled(
      directRooms.map(async (room) => {
        const detailRes = await roomService.getById(room.id);
        const payload = detailRes?.data?.data;
        const members = payload?.members || [];
        const other = members.find((m) => Number(m?.id) !== currentUserId);
        return {
          id: room.id,
          name: other?.username || other?.email || room.name || 'Chat',
          contact_id: other?.id ?? null,
        };
      })
    );

    const infoMap = new Map();
    detailResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.id) {
        infoMap.set(Number(result.value.id), result.value);
      }
    });

    return rooms.map((room) => {
      const info = infoMap.get(Number(room.id));
      if (!info) return room;
      return { ...room, name: info.name, contact_id: info.contact_id };
    });
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to load rooms');
  }
});

export const fetchRoomById = createAsyncThunk('rooms/fetchRoomById', async (roomId, { rejectWithValue }) => {
  try {
    const res = await roomService.getById(roomId);
    return res.data.data; // { room, members }
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to load room');
  }
});

export const createDirectRoom = createAsyncThunk('rooms/createDirect', async (userId, { rejectWithValue }) => {
  try {
    const res = await roomService.createDirect(userId);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to create direct room');
  }
});

export const createGroupRoom = createAsyncThunk('rooms/createGroup', async ({ name, description, memberIds }, { rejectWithValue }) => {
  try {
    const res = await roomService.createGroup(name, description, memberIds);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to create group');
  }
});

const roomsSlice = createSlice({
  name: 'rooms',
  initialState: roomsAdapter.getInitialState({
    status: 'idle',
    error: null,
    stats: {},
    onlineUsers: [],
    activeRoomMembers: [], // members of the currently viewed room
  }),
  reducers: {
    // Incoming message from someone else while NOT viewing the room → increments unread badge
    receiveWsMessage(state, action) {
      const { room: roomId, text, sent_at } = action.payload;
      const id = Number(roomId);
      const existing = state.entities[id];
      if (existing) {
        roomsAdapter.updateOne(state, {
          id,
          changes: {
            last_message: text,
            last_message_at: sent_at ? new Date(sent_at * 1000).toISOString() : new Date().toISOString(),
            unread_count: (existing.unread_count || 0) + 1,
          },
        });
      }
    },
    // Own message OR actively viewing the room → update preview only, no badge increment
    updateRoomLastMessage(state, action) {
      const { room: roomId, text, sent_at } = action.payload;
      const id = Number(roomId);
      const existing = state.entities[id];
      if (existing) {
        roomsAdapter.updateOne(state, {
          id,
          changes: {
            last_message: text,
            last_message_at: sent_at ? new Date(sent_at * 1000).toISOString() : new Date().toISOString(),
          },
        });
      }
    },
    markRoomRead(state, action) {
      const id = Number(action.payload);
      roomsAdapter.updateOne(state, { id, changes: { unread_count: 0 } });
    },
    setActiveRoomMembers(state, action) {
      state.activeRoomMembers = action.payload;
    },
    // Add or update a room received via notify WS (e.g. room_added event)
    upsertRoom(state, action) {
      roomsAdapter.upsertOne(state, action.payload);
    },
    // Remove a room from the list (after deletion)
    removeRoom(state, action) {
      roomsAdapter.removeOne(state, Number(action.payload));
    },
    /** Clear all rooms (e.g. after leaving a workspace) before loading the next tenant. */
    clearRooms(state) {
      roomsAdapter.removeAll(state);
      state.stats = {};
      state.onlineUsers = [];
      state.activeRoomMembers = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.stats = action.payload.stats || {};
        state.onlineUsers = action.payload.online_users || [];
        roomsAdapter.setAll(state, action.payload.rooms || []);
      })
      .addCase(fetchDashboard.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })

      .addCase(fetchRooms.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.status = 'succeeded';
        roomsAdapter.setAll(state, action.payload || []);
      })
      .addCase(fetchRooms.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })

      .addCase(fetchRoomById.fulfilled, (state, action) => {
        const { room, members } = action.payload;
        if (room) roomsAdapter.upsertOne(state, room);
        if (members) state.activeRoomMembers = members;
      })

      .addCase(createDirectRoom.fulfilled, (state, action) => {
        roomsAdapter.upsertOne(state, action.payload);
      })
      .addCase(createGroupRoom.fulfilled, (state, action) => {
        roomsAdapter.upsertOne(state, action.payload);
      });
  },
});

export const { receiveWsMessage, updateRoomLastMessage, markRoomRead, setActiveRoomMembers, upsertRoom, removeRoom, clearRooms } = roomsSlice.actions;
export const { selectAll: selectAllRooms, selectById: selectRoomById } = roomsAdapter.getSelectors((s) => s.rooms);
export default roomsSlice.reducer;
