import { Users, LayoutList } from "lucide-react";

const TasksHubWorkspaceSidebar = ({
	groupRooms,
	workspaceId,
	onSelectWorkspace,
}) => (
	<aside className='flex w-full flex-shrink-0 flex-row gap-2 overflow-x-auto overflow-y-hidden border-b border-slate-800 bg-slate-900 px-2 py-2 scrollbar-thin lg:w-56 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-0 lg:py-4'>
		<p className='hidden px-4 py-0 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:block'>
			Ruang
		</p>
		<button
			type='button'
			onClick={() => onSelectWorkspace(null)}
			className={`mb-0 flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 lg:mx-2 lg:mb-1 ${
				workspaceId === null ?
					"bg-indigo-600 text-white"
				:	"text-slate-300 hover:bg-slate-800"
			}`}
		>
			<LayoutList className='h-4 w-4 flex-shrink-0' />
			<span className='whitespace-nowrap'>Semua ruang</span>
		</button>
		<div className='flex flex-row gap-0.5 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-2 lg:pb-4'>
			{groupRooms.length === 0 && (
				<p className='hidden px-3 py-2 text-xs text-slate-500 lg:block'>
					Belum ada grup
				</p>
			)}
			{groupRooms.map((g) => (
				<button
					key={g.id}
					type='button'
					onClick={() => onSelectWorkspace(g.id)}
					className={`flex w-auto flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 lg:w-full ${
						Number(workspaceId) === Number(g.id) ?
							"bg-indigo-600 text-white"
						:	"text-slate-300 hover:bg-slate-800"
					}`}
				>
					<Users className='h-4 w-4 flex-shrink-0 opacity-80' />
					<span className='max-w-[10rem] truncate sm:max-w-none'>
						{g.name || "Grup"}
					</span>
				</button>
			))}
		</div>
	</aside>
);

export default TasksHubWorkspaceSidebar;
