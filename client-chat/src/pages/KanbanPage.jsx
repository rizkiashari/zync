import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/index";
import {
	fetchBoard,
	selectBoardByRoom,
	applyTaskEvent,
} from "../store/tasksSlice";
import { fetchRoomById, selectRoomById } from "../store/roomsSlice";
import { useSocket } from "../context/SocketContext";
import KanbanColumn from "../components/kanban/KanbanColumn";
import TaskModal from "../components/kanban/TaskModal";
import ColumnModal from "../components/kanban/ColumnModal";
import MainShell from "../components/layout/MainShell";
import { taskService } from "../services/taskService";
import { deadlineForTaskUpdate } from "../lib/tasksHubLogic";
import { recentTaskService } from "../services/recentTaskService";
import { focusRing } from "../lib/uiClasses";

const KanbanPage = () => {
	const { groupId } = useParams();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { connectToRoom, disconnectRoom, on } = useSocket();

	const room = useAppSelector((s) => selectRoomById(s, Number(groupId)));
	const board = useAppSelector((s) => selectBoardByRoom(s, Number(groupId)));

	const [members, setMembers] = useState([]);
	const [loading, setLoading] = useState(true);

	// Modals
	const [taskModal, setTaskModal] = useState(null); // null | { task?, defaultColumnId? }
	const [columnModal, setColumnModal] = useState(null); // null | { column? }

	// ── Init ──────────────────────────────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		const init = async () => {
			try {
				const [, roomResult] = await Promise.all([
					dispatch(fetchBoard(Number(groupId))),
					dispatch(fetchRoomById(Number(groupId))),
				]);
				if (cancelled) return;
				if (roomResult.payload?.members) setMembers(roomResult.payload.members);
				connectToRoom(Number(groupId));
			} catch {
				if (!cancelled) navigate("/dashboard");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		init();
		return () => {
			cancelled = true;
			disconnectRoom();
		};
	}, [groupId, connectToRoom, disconnectRoom, dispatch, navigate]);

	// ── WebSocket real-time task events ───────────────────────────────────────
	useEffect(() => {
		const taskEvents = [
			"task_created",
			"task_updated",
			"task_deleted",
			"column_created",
			"column_updated",
			"column_deleted",
		];
		const unsubs = taskEvents.map((evt) =>
			on(evt, (payload) => {
				dispatch(applyTaskEvent({ ...payload, type: evt }));
			}),
		);
		return () => unsubs.forEach((fn) => fn());
	}, [on, dispatch]);

	// ── Handlers ─────────────────────────────────────────────────────────────

	const handleTaskSaved = useCallback(() => {
		// WS event will update state for all members; refetch to ensure consistency for creator
		dispatch(fetchBoard(Number(groupId)));
	}, [dispatch, groupId]);

	const handleTaskDeleted = useCallback(() => {
		dispatch(fetchBoard(Number(groupId)));
	}, [dispatch, groupId]);

	const handleColumnSaved = useCallback(() => {
		dispatch(fetchBoard(Number(groupId)));
	}, [dispatch, groupId]);

	const handleColumnDeleted = useCallback(() => {
		dispatch(fetchBoard(Number(groupId)));
	}, [dispatch, groupId]);

	const handleTaskClick = useCallback(
		(task) => {
			if (!task) return;
			// Persist recents to DB (source of truth) for Dashboard.
			recentTaskService.upsert(task.id).catch(() => {
				// Non-blocking: user should still be able to open the task.
				console.error("Failed to save recent task");
			});
			setTaskModal({ task });
		},
		[],
	);

	const handleTaskMove = useCallback(
		async (task, targetColumnId) => {
			if (task.groupId != null && Number(task.groupId) !== Number(groupId)) {
				return;
			}
			if (
				!board?.columns?.some((c) => Number(c.id) === Number(targetColumnId))
			) {
				return;
			}
			if (Number(task.column_id) === Number(targetColumnId)) return;
			try {
				await taskService.updateTask(task.id, {
					title: task.title,
					priority: task.priority || "medium",
					columnId: targetColumnId,
					deadlineAt: deadlineForTaskUpdate(task),
				});
				toast.success("Task dipindahkan");
				dispatch(fetchBoard(Number(groupId)));
			} catch {
				toast.error("Gagal memindahkan task");
			}
		},
		[board?.columns, dispatch, groupId],
	);

	// ── Render ────────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<MainShell>
				<div className='flex flex-1 items-center justify-center'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent' />
				</div>
			</MainShell>
		);
	}

	if (!board) return null;

	const columns = board.columns ?? [];

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
				{/* Top bar */}
				<div className='flex flex-shrink-0 flex-col gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-clean backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4'>
					<div className='flex min-w-0 items-center gap-2 sm:gap-3'>
						<Link
							to={`/group/${groupId}`}
							aria-label='Kembali ke grup'
							className={`flex h-11 min-h-11 w-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
						>
							<ArrowLeft className='h-5 w-5' />
						</Link>
						<ClipboardList className='h-5 w-5 flex-shrink-0 text-indigo-600' />
						<div className='min-w-0'>
							<h1 className='text-sm font-semibold tracking-tight text-slate-900 sm:text-base'>
								Track task
							</h1>
							<p className='mt-0.5 truncate text-xs text-slate-500'>
								{room?.name || "Group"}
							</p>
						</div>
					</div>
					<button
						type='button'
						onClick={() => setColumnModal({})}
						className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-clean ring-1 ring-indigo-700/20 transition-colors hover:bg-indigo-700 sm:w-auto ${focusRing}`}
					>
						<Plus className='h-4 w-4' />
						Tambah Kolom
					</button>
				</div>

				{/* Board */}
				<div className='min-h-0 flex-1 overflow-x-auto overflow-y-hidden'>
					<div className='flex h-full items-start gap-3 p-4 sm:gap-4 sm:p-6'>
						{columns.map((col) => (
							<KanbanColumn
								key={col.id}
								column={col}
								boardId={board.id}
								members={members}
								groupId={Number(groupId)}
								onTaskClick={handleTaskClick}
								onEditColumn={(c) => setColumnModal({ column: c })}
								onColumnDeleted={handleColumnDeleted}
								onTaskCreated={(colId) =>
									setTaskModal({ defaultColumnId: colId })
								}
								onTaskMove={handleTaskMove}
							/>
						))}

						{/* Empty state */}
						{columns.length === 0 && (
							<div className='flex flex-col items-center justify-center w-full text-center py-20 text-slate-400'>
								<ClipboardList className='w-12 h-12 mb-3 text-slate-300' />
								<p className='font-medium text-slate-500'>Belum ada kolom</p>
								<p className='text-sm mt-1'>
									Klik "+ Tambah Kolom" untuk memulai board
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Task Modal */}
			{taskModal && (
				<TaskModal
					task={taskModal.task ?? null}
					boardId={board.id}
					columns={columns}
					members={members}
					defaultColumnId={taskModal.defaultColumnId ?? null}
					onClose={() => setTaskModal(null)}
					onSaved={handleTaskSaved}
					onDeleted={handleTaskDeleted}
				/>
			)}

			{/* Column Modal */}
			{columnModal && (
				<ColumnModal
					boardId={board.id}
					column={columnModal.column ?? null}
					onClose={() => setColumnModal(null)}
					onSaved={handleColumnSaved}
				/>
			)}
		</MainShell>
	);
};

export default KanbanPage;
