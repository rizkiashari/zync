import { useState } from "react";
import { GripVertical } from "lucide-react";
import { issueKey, priorityMeta } from "../../lib/taskOverview";
import {
	TASK_DRAG_MIME,
	serializeTaskForDrag,
	parseTaskDragPayload,
} from "../../lib/taskDragPayload";

const TasksHubListTable = ({ rows, onOpenKanban, onMoveTask }) => {
	const [dropTargetKey, setDropTargetKey] = useState(null);

	return (
		<div className='bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto max-w-6xl'>
			<p className='text-xs text-slate-500 px-4 py-2 border-b border-slate-50'>
				Tarik baris ke baris lain untuk mengubah status (kolom tujuan sama
				dengan status baris yang dilewati).
			</p>
			<table className='w-full text-sm'>
				<thead>
					<tr className='border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide'>
						<th className='px-2 py-3 w-8' aria-label='Geser' />
						<th className='px-4 py-3 w-28'>Kode</th>
						<th className='px-4 py-3'>Ringkasan</th>
						<th className='px-4 py-3 w-36'>Status</th>
						<th className='px-4 py-3 w-24'>Prioritas</th>
						<th className='px-4 py-3 w-40'>Grup</th>
						<th className='px-4 py-3 w-28' />
					</tr>
				</thead>
				<tbody className='divide-y divide-slate-50'>
					{rows.length === 0 && (
						<tr>
							<td colSpan={7} className='px-4 py-12 text-center text-slate-500'>
								Tidak ada isu untuk filter ini.
							</td>
						</tr>
					)}
					{rows.map((t) => {
						const pr = priorityMeta[t.priority] || priorityMeta.medium;
						const rowKey = `${t.groupId}-${t.id}`;
						const isOver = dropTargetKey === rowKey;
						return (
							<tr
								key={rowKey}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData(
										TASK_DRAG_MIME,
										serializeTaskForDrag(t),
									);
									e.dataTransfer.effectAllowed = "move";
								}}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setDropTargetKey(rowKey);
								}}
								onDragLeave={(e) => {
									if (!e.currentTarget.contains(e.relatedTarget)) {
										setDropTargetKey((cur) => (cur === rowKey ? null : cur));
									}
								}}
								onDrop={(e) => {
									e.preventDefault();
									setDropTargetKey(null);
									const dragged = parseTaskDragPayload(e.dataTransfer);
									if (dragged) onMoveTask(dragged, t.statusLabel);
								}}
								onDragEnd={() => setDropTargetKey(null)}
								className={`transition-colors ${
									isOver ? "bg-indigo-50" : ""
								} hover:bg-slate-50/80 cursor-grab active:cursor-grabbing`}
							>
								<td className='px-2 py-2.5 text-slate-300'>
									<GripVertical className='w-4 h-4' />
								</td>
								<td className='px-4 py-2.5 font-mono text-xs text-slate-500'>
									{issueKey(t)}
								</td>
								<td className='px-4 py-2.5 font-medium text-slate-800'>
									{t.title}
								</td>
								<td className='px-4 py-2.5'>
									<span
										className='inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md'
										style={{
											backgroundColor: `${t.statusColor}22`,
											color: "#334155",
										}}
									>
										{t.statusLabel}
									</span>
								</td>
								<td className='px-4 py-2.5'>
									<span
										className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${pr.className}`}
									>
										{pr.label}
									</span>
								</td>
								<td className='px-4 py-2.5 text-slate-600 truncate max-w-[10rem]'>
									{t.groupName}
								</td>
								<td className='px-4 py-2.5 text-right'>
									<button
										type='button'
										draggable={false}
										onClick={(e) => {
											e.stopPropagation();
											onOpenKanban(t.groupId);
										}}
										className='text-indigo-600 text-xs font-semibold hover:underline cursor-pointer'
									>
										Papan
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export default TasksHubListTable;
