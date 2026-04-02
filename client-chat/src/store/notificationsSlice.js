import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../services/notificationService';

function unreadFromItems(items) {
  return items.filter((n) => !n.read_at).length;
}

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await notificationService.list(50);
    const d = res.data?.data ?? {};
    const items = Array.isArray(d.notifications)
      ? d.notifications
      : Array.isArray(d)
        ? d
        : [];
    const unreadCount =
      typeof d.unread_count === 'number' ? d.unread_count : unreadFromItems(items);
    return { items, unreadCount };
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to load notifications');
  }
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await notificationService.markAllRead();
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to mark read');
  }
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await notificationService.markRead(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to mark read');
  }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    status: 'idle',
  },
  reducers: {
    prependNotification(state, action) {
      state.items.unshift(action.payload);
      if (!action.payload.read_at) state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.status = 'failed'; })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const now = new Date().toISOString();
        state.items = state.items.map((n) => ({ ...n, read_at: n.read_at || now }));
        state.unreadCount = 0;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find((n) => n.id === action.payload);
        if (item && !item.read_at) {
          item.read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export default notificationsSlice.reducer;
