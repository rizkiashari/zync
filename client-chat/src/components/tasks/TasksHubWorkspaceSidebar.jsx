import { Users, LayoutList } from "lucide-react";

const TasksHubWorkspaceSidebar = ({
	groupRooms,
	workspaceId,
	onSelectWorkspace,
}) => (
	<aside className='w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col pt-4'>
		<p className='px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2'>
			Ruang
		</p>
		<button
			type='button'
			onClick={() => onSelectWorkspace(null)}
			className={`mx-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
				workspaceId === null ?
					"bg-indigo-600 text-white"
				:	"text-slate-300 hover:bg-slate-800"
			}`}
		>
			<LayoutList className='w-4 h-4 flex-shrink-0' />
			Semua ruang
		</button>
		<div className='flex-1 overflow-y-auto px-2 pb-4 space-y-0.5'>
			{groupRooms.length === 0 && (
				<p className='px-3 py-2 text-xs text-slate-500'>Belum ada grup</p>
			)}
			{groupRooms.map((g) => (
				<button
					key={g.id}
					type='button'
					onClick={() => onSelectWorkspace(g.id)}
					className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
						Number(workspaceId) === Number(g.id) ?
							"bg-indigo-600 text-white"
						:	"text-slate-300 hover:bg-slate-800"
					}`}
				>
					<Users className='w-4 h-4 flex-shrink-0 opacity-80' />
					<span className='truncate'>{g.name || "Grup"}</span>
				</button>
			))}
		</div>
	</aside>
);

export default TasksHubWorkspaceSidebar;
