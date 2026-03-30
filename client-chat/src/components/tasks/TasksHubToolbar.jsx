import { Search } from "lucide-react";
import { TASKS_HUB_TABS } from "./tasksHubConfig";

const TasksHubToolbar = ({
	mainTab,
	onMainTab,
	query,
	onQuery,
	showDone,
	onShowDone,
}) => (
	<header className='flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4'>
		<div className='flex flex-wrap items-center justify-between gap-4'>
			<div>
				<h1 className='text-lg font-bold text-slate-800'>Task</h1>
				<p className='text-xs text-slate-500 mt-0.5'>
					Backlog, daftar isu, dan akses papan — pola mirip Jira
				</p>
			</div>
			<div className='relative min-w-[200px] max-w-md flex-1'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
				<input
					type='search'
					placeholder='Cari judul, kode TASK-…, atau grup…'
					value={query}
					onChange={(e) => onQuery(e.target.value)}
					className='w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
				/>
			</div>
		</div>

		<div className='flex flex-wrap items-center gap-2 mt-4'>
			{TASKS_HUB_TABS.map(({ id, label, icon: Icon }) => (
				<button
					key={id}
					type='button'
					onClick={() => onMainTab(id)}
					className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
						mainTab === id ?
							"bg-indigo-600 text-white shadow-sm"
						:	"bg-slate-100 text-slate-600 hover:bg-slate-200"
					}`}
				>
					<Icon className='w-3.5 h-3.5' />
					{label}
				</button>
			))}
			<label className='ml-auto flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none'>
				<input
					type='checkbox'
					checked={showDone}
					onChange={(e) => onShowDone(e.target.checked)}
					className='rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
				/>
				Tampilkan selesai
			</label>
		</div>
	</header>
);

export default TasksHubToolbar;
