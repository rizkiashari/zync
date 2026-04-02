import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { setWorkspace, setWorkspaceList, clearWorkspace } from './workspaceSlice';
import { workspaceService } from '../services/workspaceService';

const TOKEN_KEY   = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY    = 'zync_user';

function saveTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const res = await authService.login(email, password);
      const { access_token, refresh_token, user, workspace, workspaces } = res.data.data;
      saveTokens(access_token, refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      const wsList = Array.isArray(workspaces) ? workspaces : [];
      // Prevent stale workspace from localStorage when the account has none.
      if (!workspace || wsList.length === 0) {
        dispatch(clearWorkspace());
      } else {
        dispatch(setWorkspace(workspace));
        dispatch(setWorkspaceList(wsList));
      }
      return user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Login failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async ({ email, password, username }, { rejectWithValue, dispatch }) => {
    try {
      const res = await authService.register(email, password, username);
      const { access_token, refresh_token, user } = res.data.data;
      saveTokens(access_token, refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // New accounts have no workspace until onboarding (create or join with invite).
      dispatch(clearWorkspace());
      try {
        const listRes = await workspaceService.listMine();
        const wsList = listRes?.data?.data?.workspaces;
        dispatch(setWorkspaceList(Array.isArray(wsList) ? wsList : []));
      } catch {
        dispatch(setWorkspaceList([]));
      }
      return user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Registration failed');
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) await authService.logout(refreshToken);
  } catch {
    // ignore logout errors
  } finally {
    clearTokens();
    dispatch(clearWorkspace());
  }
});

export const restoreSessionThunk = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return rejectWithValue('no token');
    try {
      const res = await profileService.get();
      const user = res.data.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch {
      clearTokens();
      return rejectWithValue('session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    initialized: false,
  },
  reducers: {
    clearAuth(state) {
      state.user = null;
      state.status = 'idle';
      state.error = null;
      clearTokens();
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginThunk.pending,    (state) => { state.status = 'loading'; state.error = null; })
      .addCase(loginThunk.fulfilled,  (state, action) => { state.status = 'succeeded'; state.user = action.payload; })
      .addCase(loginThunk.rejected,   (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // register
      .addCase(registerThunk.pending,   (state) => { state.status = 'loading'; state.error = null; })
      .addCase(registerThunk.fulfilled, (state, action) => { state.status = 'succeeded'; state.user = action.payload; })
      .addCase(registerThunk.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // logout
      .addCase(logoutThunk.fulfilled, (state) => { state.user = null; state.status = 'idle'; })
      // restore session
      .addCase(restoreSessionThunk.pending,   (state) => { state.status = 'loading'; })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.status = 'idle';
        state.user = null;
        state.initialized = true;
      });
  },
});

export const { clearAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;
