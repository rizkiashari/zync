import { useState } from "react";
import { Flag, ExternalLink, GripVertical } from "lucide-react";
import { issueKey, priorityMeta } from "../../lib/taskOverview";
import {
	TASK_DRAG_MIME,
	serializeTaskForDrag,
	parseTaskDragPayload,
} from "../../lib/taskDragPayload";
import { cardClean } from "../../lib/uiClasses";

const TasksHubBacklog = ({ sections, onOpenKanban, onMoveTask }) => {
	const [dropTargetSection, setDropTargetSection] = useState(null);

	return (
		<div className='space-y-6 max-w-5xl'>
			<p className='text-xs text-slate-500 -mt-2 mb-2'>
				Geser task antar kolom: tarik baris lalu lepas di kolom tujuan.
			</p>
			{sections.length === 0 && (
				<p className='text-slate-500 text-sm text-center py-12'>
					Tidak ada task di backlog untuk filter ini.
				</p>
			)}
			{sections.map((section) => (
				<section
					key={section.name}
					className={`${cardClean} overflow-hidden transition-shadow ${
						dropTargetSection === section.name ?
							"border-indigo-400 ring-2 ring-indigo-200"
						:	""
					}`}
					onDragOver={(e) => {
						e.preventDefault();
						e.dataTransfer.dropEffect = "move";
						setDropTargetSection(section.name);
					}}
					onDragLeave={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget)) {
							setDropTargetSection((cur) =>
								cur === section.name ? null : cur,
							);
						}
					}}
					onDrop={(e) => {
						e.preventDefault();
						setDropTargetSection(null);
						const task = parseTaskDragPayload(e.dataTransfer);
						if (task) onMoveTask(task, section.name);
					}}
				>
					<div
						className='px-4 py-3 flex items-center justify-between'
						style={{
							borderLeft: `4px solid ${section.color}`,
							backgroundColor: `${section.color}12`,
						}}
					>
						<span className='font-semibold text-slate-800'>{section.name}</span>
						<span className='text-xs text-slate-500'>
							{section.tasks.length} isu
						</span>
					</div>
					<ul className='divide-y divide-slate-100'>
						{section.tasks.map((t) => {
							const pr = priorityMeta[t.priority] || priorityMeta.medium;
							return (
								<li
									key={`${t.groupId}-${t.id}`}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.setData(
											TASK_DRAG_MIME,
											serializeTaskForDrag(t),
										);
										e.dataTransfer.effectAllowed = "move";
									}}
									onDragEnd={() => setDropTargetSection(null)}
									className='px-4 py-3 flex items-center gap-4 hover:bg-slate-50/80 cursor-grab active:cursor-grabbing'
								>
									<GripVertical className='w-4 h-4 text-slate-300 flex-shrink-0' />
									<span className='text-[11px] font-mono text-slate-400 w-20 flex-shrink-0'>
										{issueKey(t)}
									</span>
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-medium text-slate-800 truncate'>
											{t.title}
										</p>
										<p className='text-xs text-slate-500 truncate'>
											{t.groupName}
										</p>
									</div>
									<span
										className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ${pr.className}`}
									>
										<Flag className='w-3 h-3' />
										{pr.label}
									</span>
									<button
										type='button'
										draggable={false}
										onClick={(e) => {
											e.stopPropagation();
											onOpenKanban(t.groupId);
										}}
										className='p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer'
										title='Buka papan'
									>
										<ExternalLink className='w-4 h-4' />
									</button>
								</li>
							);
						})}
					</ul>
				</section>
			))}
		</div>
	);
};

export default TasksHubBacklog;
