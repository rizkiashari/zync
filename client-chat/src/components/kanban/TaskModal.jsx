import { useState } from "react";
import { X, Trash2, UserPlus, UserMinus, Flag, Calendar } from "lucide-react";
import { taskService } from "../../services/taskService";
import toast from "react-hot-toast";

const PRIORITIES = [
	{
		value: "low",
		label: "Low",
		className: "bg-sky-100 text-sky-700 ring-sky-400",
	},
	{
		value: "medium",
		label: "Medium",
		className: "bg-amber-100 text-amber-700 ring-amber-400",
	},
	{
		value: "high",
		label: "High",
		className: "bg-red-100 text-red-700 ring-red-400",
	},
];

// TaskModal is used for both creating and editing a task
const TaskModal = ({
	task,
	boardId,
	columns,
	members,
	defaultColumnId,
	onClose,
	onSaved,
	onDeleted,
}) => {
	const isEdit = !!task;

	const [title, setTitle] = useState(task?.title ?? "");
	const [description, setDesc] = useState(task?.description ?? "");
	const [priority, setPriority] = useState(task?.priority ?? "medium");
	const [columnId, setColumnId] = useState(
		task?.column_id ?? defaultColumnId ?? columns?.[0]?.id ?? null,
	);
	const [deadline, setDeadline] = useState(
		task?.deadline_at ? task.deadline_at.slice(0, 10) : "",
	);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [assignees, setAssignees] = useState(task?.assignees ?? []);

	// Build a quick lookup of who's assigned
	const assigneeIds = new Set(assignees.map((a) => a.id));

	const handleSave = async () => {
		if (!title.trim()) {
			toast.error("Judul task tidak boleh kosong");
			return;
		}
		setSaving(true);
		try {
			const deadlineAt = deadline ? new Date(deadline).toISOString() : null;
			if (isEdit) {
				await taskService.updateTask(task.id, {
					title: title.trim(),
					description,
					priority,
					deadlineAt,
					columnId: columnId !== task.column_id ? columnId : undefined,
				});
			} else {
				await taskService.createTask(boardId, {
					columnId,
					title: title.trim(),
					description,
					priority,
					deadlineAt,
				});
			}
			onSaved();
			onClose();
		} catch {
			toast.error("Gagal menyimpan task");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm("Hapus task ini?")) return;
		setDeleting(true);
		try {
			await taskService.deleteTask(task.id);
			onDeleted();
			onClose();
		} catch {
			toast.error("Gagal menghapus task");
		} finally {
			setDeleting(false);
		}
	};

	const toggleAssignee = async (member) => {
		if (!isEdit) return; // assignees only available after task is created
		try {
			if (assigneeIds.has(member.id)) {
				await taskService.removeAssignee(task.id, member.id);
				setAssignees((prev) => prev.filter((a) => a.id !== member.id));
			} else {
				const res = await taskService.addAssignee(task.id, member.id);
				setAssignees(res.data.data.assignees);
			}
		} catch {
			toast.error("Gagal mengubah assignee");
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
			<div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col'>
				{/* Header */}
				<div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100'>
					<h3 className='text-base font-semibold text-slate-800'>
						{isEdit ? "Edit Task" : "Buat Task Baru"}
					</h3>
					<button
						onClick={onClose}
						className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
					>
						<X className='w-4 h-4 text-slate-500' />
					</button>
				</div>

				{/* Body */}
				<div className='overflow-y-auto flex-1 px-5 py-4 space-y-4'>
					{/* Title */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>
							Judul *
						</label>
						<input
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'
							placeholder='Judul task...'
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

					{/* Description */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>
							Deskripsi
						</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none'
							placeholder='Deskripsi opsional...'
							value={description}
							onChange={(e) => setDesc(e.target.value)}
						/>
					</div>

					{/* Column */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>
							Kolom / Status
						</label>
						<select
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'
							value={columnId ?? ""}
							onChange={(e) => setColumnId(Number(e.target.value))}
						>
							{columns.map((col) => (
								<option key={col.id} value={col.id}>
									{col.name}
								</option>
							))}
						</select>
					</div>

					{/* Priority */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
							<Flag className='w-3.5 h-3.5' /> Prioritas
						</label>
						<div className='flex gap-2'>
							{PRIORITIES.map((p) => (
								<button
									key={p.value}
									onClick={() => setPriority(p.value)}
									className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${
										priority === p.value ?
											`${p.className} ring-2 border-transparent`
										:	"bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
									}`}
								>
									{p.label}
								</button>
							))}
						</div>
					</div>

					{/* Deadline */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
							<Calendar className='w-3.5 h-3.5' /> Deadline
						</label>
						<input
							type='date'
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'
							value={deadline}
							onChange={(e) => setDeadline(e.target.value)}
						/>
					</div>

					{/* Assignees — only visible when editing */}
					{isEdit && members && members.length > 0 && (
						<div>
							<label className='text-xs font-medium text-slate-600 mb-2 flex items-center gap-1'>
								<UserPlus className='w-3.5 h-3.5' /> Assign Anggota
							</label>
							<div className='space-y-1 max-h-36 overflow-y-auto'>
								{members.map((m) => {
									const assigned = assigneeIds.has(m.id);
									return (
										<button
											key={m.id}
											onClick={() => toggleAssignee(m)}
											className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
												assigned ?
													"bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
												:	"bg-slate-50 text-slate-700 hover:bg-slate-100"
											}`}
										>
											<div className='w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0'>
												{m.avatar ?
													<img
														src={m.avatar}
														alt=''
														className='w-full h-full object-cover'
													/>
												:	(m.username || m.email || "?")[0].toUpperCase()}
											</div>
											<span className='flex-1 text-left font-medium'>
												{m.username || m.email}
											</span>
											{assigned ?
												<UserMinus className='w-4 h-4 text-indigo-500' />
											:	<UserPlus className='w-4 h-4 text-slate-400' />}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='flex items-center gap-2 px-5 py-4 border-t border-slate-100'>
					{isEdit && (
						<button
							onClick={handleDelete}
							disabled={deleting}
							className='flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors'
						>
							<Trash2 className='w-4 h-4' />
							Hapus
						</button>
					)}
					<div className='flex gap-2 ml-auto'>
						<button
							onClick={onClose}
							className='px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors'
						>
							Batal
						</button>
						<button
							onClick={handleSave}
							disabled={saving}
							className='px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors'
						>
							{saving ?
								"Menyimpan..."
							: isEdit ?
								"Simpan"
							:	"Buat Task"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TaskModal;
