import { useState, useMemo } from "react";
import { X, Flag, Calendar } from "lucide-react";
import { taskService } from "../../services/taskService";
import toast from "react-hot-toast";

const PRIORITIES = [
	{ value: "low", label: "Low", cls: "bg-sky-100 text-sky-700 ring-sky-400" },
	{ value: "medium", label: "Medium", cls: "bg-amber-100 text-amber-700 ring-amber-400" },
	{ value: "high", label: "High", cls: "bg-red-100 text-red-700 ring-red-400" },
];

const TasksHubCreateModal = ({ groupRooms, boardsByRoomId, onClose, onCreated }) => {
	const [roomId, setRoomId] = useState(groupRooms[0]?.id ?? null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [deadline, setDeadline] = useState("");
	const [saving, setSaving] = useState(false);

	const board = useMemo(() => (roomId ? boardsByRoomId[roomId] : null), [roomId, boardsByRoomId]);
	const columns = board?.columns ?? [];
	const [columnId, setColumnId] = useState(null);

	const effectiveColumnId = columnId ?? columns[0]?.id ?? null;

	const handleSave = async () => {
		if (!title.trim()) {
			toast.error("Judul task tidak boleh kosong");
			return;
		}
		if (!board?.id) {
			toast.error("Board grup belum tersedia");
			return;
		}
		if (!effectiveColumnId) {
			toast.error("Pilih kolom terlebih dahulu");
			return;
		}
		setSaving(true);
		try {
			await taskService.createTask(board.id, {
				columnId: effectiveColumnId,
				title: title.trim(),
				description,
				priority,
				deadlineAt: deadline ? new Date(deadline).toISOString() : null,
			});
			toast.success("Task berhasil dibuat");
			onCreated();
			onClose();
		} catch {
			toast.error("Gagal membuat task");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
			<div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col'>
				<div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100'>
					<h3 className='text-base font-semibold text-slate-800'>Buat Task Baru</h3>
					<button onClick={onClose} className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'>
						<X className='w-4 h-4 text-slate-500' />
					</button>
				</div>

				<div className='overflow-y-auto flex-1 px-5 py-4 space-y-4'>
					{/* Group */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>Grup</label>
						<select
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'
							value={roomId ?? ""}
							onChange={(e) => {
								setRoomId(Number(e.target.value));
								setColumnId(null);
							}}
						>
							{groupRooms.map((r) => (
								<option key={r.id} value={r.id}>
									{r.name || `Grup ${r.id}`}
								</option>
							))}
						</select>
					</div>

					{/* Column */}
					{columns.length > 0 && (
						<div>
							<label className='text-xs font-medium text-slate-600 mb-1.5 block'>Kolom / Status</label>
							<select
								className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'
								value={effectiveColumnId ?? ""}
								onChange={(e) => setColumnId(Number(e.target.value))}
							>
								{columns.map((col) => (
									<option key={col.id} value={col.id}>
										{col.name}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Title */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>Judul *</label>
						<input
							autoFocus
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'
							placeholder='Judul task...'
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
						/>
					</div>

					{/* Description */}
					<div>
						<label className='text-xs font-medium text-slate-600 mb-1.5 block'>Deskripsi</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none'
							placeholder='Deskripsi opsional...'
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
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
									type='button'
									onClick={() => setPriority(p.value)}
									className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${
										priority === p.value
											? `${p.cls} ring-2 border-transparent`
											: "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
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
				</div>

				<div className='flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100'>
					<button
						type='button'
						onClick={onClose}
						className='px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors'
					>
						Batal
					</button>
					<button
						type='button'
						onClick={handleSave}
						disabled={saving}
						className='px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors'
					>
						{saving ? "Membuat..." : "Buat Task"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default TasksHubCreateModal;
