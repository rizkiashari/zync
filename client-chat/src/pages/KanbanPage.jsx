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
import Sidebar from "../components/layout/Sidebar";
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
			const columnName = board?.columns?.find(
				(col) => col.id === task.column_id,
			)?.name;
			// Persist recents to DB (source of truth) for Dashboard.
			recentTaskService.upsert(task.id).catch(() => {
				// Non-blocking: user should still be able to open the task.
				// eslint-disable-next-line no-console
				console.error("Failed to save recent task");
			});
			setTaskModal({ task });
		},
		[board, groupId, room?.name],
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
			<div className='flex h-screen bg-slate-50'>
				<Sidebar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
				</div>
			</div>
		);
	}

	if (!board) return null;

	const columns = board.columns ?? [];

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />
			<div className='flex-1 flex flex-col min-w-0'>
				{/* Top bar */}
				<div className='flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-clean flex-shrink-0'>
					<div className='flex items-center gap-3 min-w-0'>
						<Link
							to={`/group/${groupId}`}
							aria-label='Kembali ke grup'
							className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 ${focusRing}`}
						>
							<ArrowLeft className='w-5 h-5' />
						</Link>
						<ClipboardList className='w-5 h-5 text-indigo-600' />
						<div>
							<h1 className='text-base font-semibold text-slate-900 tracking-tight'>
								Track task
							</h1>
							<p className='text-xs text-slate-500 mt-0.5'>
								{room?.name || "Group"}
							</p>
						</div>
					</div>
					<button
						type='button'
						onClick={() => setColumnModal({})}
						className={`flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-clean ring-1 ring-indigo-700/20 ${focusRing}`}
					>
						<Plus className='w-4 h-4' />
						Tambah Kolom
					</button>
				</div>

				{/* Board */}
				<div className='flex-1 overflow-x-auto overflow-y-hidden'>
					<div className='flex gap-4 p-6 h-full items-start'>
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
		</div>
	);
};

export default KanbanPage;
