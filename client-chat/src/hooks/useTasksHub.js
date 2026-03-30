import { useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "../store/index";
import { selectAllRooms } from "../store/roomsSlice";
import { useGroupTaskBoards } from "./useGroupTaskBoards";
import { buildTaskColumnSections } from "../lib/taskOverview";
import {
	filterBacklogSections,
	buildTaskListRows,
	filterGroupsByWorkspace,
	resolveColumnIdForSectionName,
	deadlineForTaskUpdate,
} from "../lib/tasksHubLogic";
import { taskService } from "../services/taskService";

/**
 * State + data derivasi untuk halaman Task hub (terpisah dari UI).
 */
export const useTasksHub = () => {
	const rooms = useAppSelector(selectAllRooms);

	const groupRooms = useMemo(
		() => rooms.filter((r) => r.type === "group"),
		[rooms],
	);

	const {
		boardsByRoomId,
		loading,
		refetch: refetchBoards,
	} = useGroupTaskBoards(groupRooms);

	const allSections = useMemo(
		() => buildTaskColumnSections(groupRooms, boardsByRoomId),
		[groupRooms, boardsByRoomId],
	);

	const [workspaceId, setWorkspaceId] = useState(null);
	const [mainTab, setMainTab] = useState("backlog");
	const [query, setQuery] = useState("");
	const [showDone, setShowDone] = useState(false);

	const filters = useMemo(
		() => ({ workspaceId, query, showDone }),
		[workspaceId, query, showDone],
	);

	const backlogSections = useMemo(
		() => filterBacklogSections(allSections, filters),
		[allSections, filters],
	);

	const listRows = useMemo(
		() => buildTaskListRows(allSections, filters),
		[allSections, filters],
	);

	const visibleGroupRooms = useMemo(
		() => filterGroupsByWorkspace(groupRooms, workspaceId),
		[groupRooms, workspaceId],
	);

	const moveTaskToSection = useCallback(
		async (task, targetSectionName) => {
			const board = boardsByRoomId[task.groupId];
			const colId = resolveColumnIdForSectionName(board, targetSectionName);
			if (!colId) {
				toast.error("Kolom tidak ditemukan di board grup ini");
				return;
			}
			if (Number(colId) === Number(task.column_id)) return;
			try {
				await taskService.updateTask(task.id, {
					title: task.title,
					priority: task.priority || "medium",
					columnId: colId,
					deadlineAt: deadlineForTaskUpdate(task),
				});
				toast.success("Task dipindahkan");
				await refetchBoards({ quiet: true });
			} catch {
				toast.error("Gagal memindahkan task");
			}
		},
		[boardsByRoomId, refetchBoards],
	);

	return {
		groupRooms,
		boardsByRoomId,
		loading,
		workspaceId,
		setWorkspaceId,
		mainTab,
		setMainTab,
		query,
		setQuery,
		showDone,
		setShowDone,
		backlogSections,
		listRows,
		visibleGroupRooms,
		moveTaskToSection,
	};
};
