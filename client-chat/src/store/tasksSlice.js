import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../services/taskService';

export const fetchBoard = createAsyncThunk(
  'tasks/fetchBoard',
  async (roomId) => {
    const res = await taskService.getBoard(roomId);
    return res.data.data;
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    // boardId → BoardWithColumns
    boards: {},
    // roomId → boardId (lookup)
    roomBoardMap: {},
    loading: false,
    error: null,
  },
  reducers: {
    // Apply real-time WS event
    applyTaskEvent(state, action) {
      const { type, task, task_id, column, column_id } = action.payload;

      // Resolve board for task events
      const taskBoard = task?.board_id ? state.boards[task.board_id] : null;
      // Resolve board for column events
      const colBoard = column?.board_id ? state.boards[column.board_id] : null;

      if (type === 'task_created' && taskBoard) {
        const col = taskBoard.columns.find((c) => c.id === task.column_id);
        if (col && !col.tasks.some((t) => t.id === task.id)) {
          col.tasks.push(task);
        }
        return;
      }

      if (type === 'task_updated' && taskBoard) {
        // Remove from all columns first, then insert into correct column
        for (const col of taskBoard.columns) {
          col.tasks = col.tasks.filter((t) => t.id !== task.id);
        }
        const targetCol = taskBoard.columns.find((c) => c.id === task.column_id);
        if (targetCol) targetCol.tasks.push(task);
        return;
      }

      if (type === 'task_deleted') {
        // Search across all boards
        for (const board of Object.values(state.boards)) {
          for (const col of board.columns) {
            col.tasks = col.tasks.filter((t) => t.id !== task_id);
          }
        }
        return;
      }

      if (type === 'column_created' && colBoard) {
        if (!colBoard.columns.some((c) => c.id === column.id)) {
          colBoard.columns.push({ ...column, tasks: [] });
        }
        return;
      }

      if (type === 'column_updated' && colBoard) {
        const idx = colBoard.columns.findIndex((c) => c.id === column.id);
        if (idx !== -1) colBoard.columns[idx] = { ...colBoard.columns[idx], ...column };
        return;
      }

      if (type === 'column_deleted') {
        for (const board of Object.values(state.boards)) {
          board.columns = board.columns.filter((c) => c.id !== column_id);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.loading = false;
        const board = action.payload;
        state.boards[board.id] = board;
        state.roomBoardMap[board.room_id] = board.id;
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { applyTaskEvent } = tasksSlice.actions;

export const selectBoardByRoom = (state, roomId) => {
  const boardId = state.tasks.roomBoardMap[roomId];
  return boardId ? state.tasks.boards[boardId] : null;
};

export default tasksSlice.reducer;
