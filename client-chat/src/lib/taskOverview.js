/** Urutkan section kolom: Backlog → Todo → In Progress → Done. */
export const columnSectionSortRank = (name) => {
	const n = (name || "").trim().toLowerCase();
	const ordered = [
		"backlog",
		"to do",
		"todo",
		"ready",
		"in progress",
		"on test",
		"doing",
		"review",
		"in review",
		"done",
		"selesai",
	];
	for (let i = 0; i < ordered.length; i += 1) {
		if (n === ordered[i] || n.includes(ordered[i])) return i;
	}
	return 40;
};

export const isDoneColumnName = (name) => {
	const n = (name || "").trim().toLowerCase();
	return n.includes("done") || n.includes("selesai");
};

export const priorityMeta = {
	high: { label: "High", className: "bg-red-50 text-red-700" },
	medium: { label: "Med", className: "bg-amber-50 text-amber-700" },
	low: { label: "Low", className: "bg-sky-50 text-sky-700" },
};

/**
 * @param {Array<{id:number,type:string,name?:string}>} groupRooms
 * @param {Record<number, {columns?:Array}>} boardsByRoomId
 */
export const buildTaskColumnSections = (groupRooms, boardsByRoomId) => {
	if (!groupRooms?.length) return [];

	const byNormName = new Map();

	for (const room of groupRooms) {
		const board = boardsByRoomId[room.id];
		if (!board) continue;

		for (const col of board.columns || []) {
			const norm = (col.name || "Tanpa nama").trim().toLowerCase();
			if (!byNormName.has(norm)) {
				byNormName.set(norm, {
					name: col.name || "Tanpa nama",
					color: col.color || "#6366f1",
					tasks: [],
				});
			}
			const section = byNormName.get(norm);
			for (const t of col.tasks || []) {
				section.tasks.push({
					...t,
					groupId: room.id,
					groupName: room.name || "Grup",
					columnName: col.name || "",
				});
			}
		}
	}

	const sections = Array.from(byNormName.values());
	sections.sort((a, b) => {
		const ra = columnSectionSortRank(a.name);
		const rb = columnSectionSortRank(b.name);
		if (ra !== rb) return ra - rb;
		return a.name.localeCompare(b.name, "id");
	});

	return sections;
};

export const issueKey = (task) => `TASK-${task.id}`;
