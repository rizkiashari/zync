export const TASK_DRAG_MIME = "application/x-chatapp-task";

export const serializeTaskForDrag = (t) =>
	JSON.stringify({
		id: t.id,
		groupId: t.groupId,
		column_id: t.column_id,
		title: t.title,
		priority: t.priority,
		deadline_at: t.deadline_at,
	});

export const parseTaskDragPayload = (dataTransfer) => {
	const raw = dataTransfer.getData(TASK_DRAG_MIME);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};
