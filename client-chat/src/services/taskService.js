import api from '../lib/api';

export const taskService = {
  // Get (or create) the board for a group room
  getBoard: (roomId) =>
    api.get(`/api/rooms/${roomId}/board`),

  // Columns
  createColumn: (boardId, name, color) =>
    api.post(`/api/boards/${boardId}/columns`, { name, color }),

  updateColumn: (colId, name, color) =>
    api.put(`/api/columns/${colId}`, { name, color }),

  deleteColumn: (colId) =>
    api.delete(`/api/columns/${colId}`),

  // Tasks
  createTask: (boardId, { columnId, title, description, priority, deadlineAt }) =>
    api.post(`/api/boards/${boardId}/tasks`, {
      column_id: columnId,
      title,
      description,
      priority,
      deadline_at: deadlineAt || null,
    }),

  updateTask: (taskId, { title, description, priority, deadlineAt, columnId }) =>
    api.put(`/api/tasks/${taskId}`, {
      title,
      description,
      priority,
      deadline_at: deadlineAt !== undefined ? deadlineAt : undefined,
      column_id: columnId,
    }),

  deleteTask: (taskId) =>
    api.delete(`/api/tasks/${taskId}`),

  // Assignees
  addAssignee: (taskId, userId) =>
    api.post(`/api/tasks/${taskId}/assignees`, { user_id: userId }),

  removeAssignee: (taskId, userId) =>
    api.delete(`/api/tasks/${taskId}/assignees/${userId}`),
};
