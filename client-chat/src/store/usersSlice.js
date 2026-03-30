import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../services/userService';

export const fetchUser = createAsyncThunk('users/fetchUser', async (id, { getState, rejectWithValue }) => {
  const cached = getState().users.cache[id];
  if (cached) return cached;
  try {
    const res = await userService.getById(id);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch user');
  }
});

export const searchUsers = createAsyncThunk('users/search', async (query, { rejectWithValue }) => {
  try {
    const res = await userService.list(query);
    return res.data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Search failed');
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    cache: {},
    searchResults: [],
    searchStatus: 'idle',
  },
  reducers: {
    clearSearch(state) {
      state.searchResults = [];
      state.searchStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (action.payload) state.cache[action.payload.id] = action.payload;
      })
      .addCase(searchUsers.pending, (state) => { state.searchStatus = 'loading'; })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        state.searchResults = action.payload;
        // Also cache results
        action.payload.forEach(u => { state.cache[u.id] = u; });
      })
      .addCase(searchUsers.rejected, (state) => { state.searchStatus = 'failed'; });
  },
});

export const { clearSearch } = usersSlice.actions;
export default usersSlice.reducer;
