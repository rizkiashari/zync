import { Search } from "lucide-react";
import { TASKS_HUB_TABS } from "./tasksHubConfig";
import { focusRing } from "../../lib/uiClasses";

const TasksHubToolbar = ({
	mainTab,
	onMainTab,
	query,
	onQuery,
	showDone,
	onShowDone,
}) => (
	<header className='flex-shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-clean backdrop-blur-sm sm:px-6 sm:py-4'>
		<div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4'>
			<div className='min-w-0'>
				<h1 className='text-base font-bold tracking-tight text-slate-900 sm:text-lg'>
					Task
				</h1>
				<p className='mt-0.5 text-xs leading-relaxed text-slate-500'>
					Backlog, daftar isu, dan akses papan — pola mirip Jira
				</p>
			</div>
			<div className='relative min-w-[200px] max-w-md flex-1'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
				<input
					type='search'
					placeholder='Cari judul, kode TASK-…, atau grup…'
					value={query}
					onChange={(e) => onQuery(e.target.value)}
					className='w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-white'
				/>
			</div>
		</div>

		<div className='mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center'>
			<div className='flex flex-wrap items-center gap-2'>
				{TASKS_HUB_TABS.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type='button'
						onClick={() => onMainTab(id)}
						className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${focusRing} ${
							mainTab === id ?
								"bg-indigo-600 text-white shadow-clean"
							:	"bg-slate-100 text-slate-600 hover:bg-slate-200"
						}`}
					>
						<Icon className='w-3.5 h-3.5' />
						{label}
					</button>
				))}
			</div>
			<label className='flex cursor-pointer select-none items-center gap-2 text-xs text-slate-600 sm:ml-auto'>
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
