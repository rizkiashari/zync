import api from '../lib/api';

export const recentTaskService = {
	list: () => api.get('/api/recent-tasks'),
	upsert: (taskId) => api.post('/api/recent-tasks', { task_id: taskId }),
	reorder: (taskIds) =>
		api.put('/api/recent-tasks/reorder', { task_ids: taskIds }),
};

