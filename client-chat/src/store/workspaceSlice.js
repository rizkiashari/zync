import { createSlice } from '@reduxjs/toolkit';

const WORKSPACE_KEY = 'zync_workspace';

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    current: (() => {
      try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY)); } catch { return null; }
    })(),
    list: [],
  },
  reducers: {
    setWorkspace(state, action) {
      state.current = action.payload;
      if (action.payload) {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(action.payload));
      } else {
        localStorage.removeItem(WORKSPACE_KEY);
      }
    },
    setWorkspaceList(state, action) {
      state.list = action.payload ?? [];
    },
    clearWorkspace(state) {
      state.current = null;
      state.list = [];
      localStorage.removeItem(WORKSPACE_KEY);
    },
  },
});

export const { setWorkspace, setWorkspaceList, clearWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
