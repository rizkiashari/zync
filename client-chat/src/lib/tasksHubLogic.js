import { isDoneColumnName, issueKey } from "./taskOverview";

/**
 * @typedef {{ workspaceId: number | null, query: string, showDone: boolean }} TasksHubFilters
 */

/**
 * Section backlog: kolom non-Done (kecuali showDone), filter grup + teks.
 */
export const filterBacklogSections = (allSections, filters) => {
	const { workspaceId, query, showDone } = filters;
	const q = query.trim().toLowerCase();

	return allSections
		.filter((s) => showDone || !isDoneColumnName(s.name))
		.map((s) => ({
			...s,
			tasks: s.tasks.filter((t) => {
				if (workspaceId != null && Number(t.groupId) !== Number(workspaceId)) {
					return false;
				}
				if (!q) return true;
				return (
					(t.title || "").toLowerCase().includes(q) ||
					(t.groupName || "").toLowerCase().includes(q) ||
					issueKey(t).toLowerCase().includes(q)
				);
			}),
		}))
		.filter((s) => s.tasks.length > 0);
};

/**
 * Baris tabel "Daftar": satu baris per task + metadata status kolom.
 */
export const buildTaskListRows = (allSections, filters) => {
	const { workspaceId, query, showDone } = filters;
	const q = query.trim().toLowerCase();
	const rows = [];

	for (const s of allSections) {
		if (!showDone && isDoneColumnName(s.name)) continue;
		for (const t of s.tasks) {
			if (workspaceId != null && Number(t.groupId) !== Number(workspaceId)) {
				continue;
			}
			if (q) {
				const hit =
					(t.title || "").toLowerCase().includes(q) ||
					(t.groupName || "").toLowerCase().includes(q) ||
					issueKey(t).toLowerCase().includes(q);
				if (!hit) continue;
			}
			rows.push({
				...t,
				statusLabel: s.name,
				statusColor: s.color,
			});
		}
	}

	rows.sort((a, b) => (a.title || "").localeCompare(b.title || "", "id"));
	return rows;
};

/** Grup yang ditampilkan di tab Papan. */
export const filterGroupsByWorkspace = (groupRooms, workspaceId) => {
	if (workspaceId == null) return groupRooms;
	return groupRooms.filter((g) => Number(g.id) === Number(workspaceId));
};

export const countBoardTasks = (board) =>
	board?.columns?.reduce((n, c) => n + (c.tasks?.length || 0), 0) ?? 0;

/** Kolom di board grup yang namanya sama dengan section backlog (case-insensitive). */
export const resolveColumnIdForSectionName = (board, sectionName) => {
	if (!board?.columns?.length) return null;
	const target = (sectionName || "").trim().toLowerCase();
	const col = board.columns.find(
		(c) => (c.name || "").trim().toLowerCase() === target,
	);
	return col?.id ?? null;
};

/** ISO string untuk updateTask agar deadline tidak terhapus di server. */
export const deadlineForTaskUpdate = (task) => {
	if (!task?.deadline_at) return undefined;
	const d = task.deadline_at;
	if (typeof d === "string") {
		return d.includes("T") ? d : new Date(d).toISOString();
	}
	return new Date(d).toISOString();
};
