import { Users, ChevronRight } from "lucide-react";
import { countBoardTasks } from "../../lib/tasksHubLogic";
import { cardClean, focusRing } from "../../lib/uiClasses";

const TasksHubBoardGrid = ({
	groupRooms,
	boardsByRoomId,
	onOpenKanban,
	onOpenGroupChat,
}) => (
	<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl'>
		{groupRooms.map((g) => {
			const board = boardsByRoomId[g.id];
			const taskCount = countBoardTasks(board);
			return (
				<div key={g.id} className={`${cardClean} p-5 flex flex-col`}>
					<div className='flex items-start gap-3 mb-4'>
						<div className='w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-clean ring-1 ring-black/5'>
							<Users className='w-5 h-5 text-white' />
						</div>
						<div className='flex-1 min-w-0'>
							<h3 className='font-semibold text-slate-800 truncate'>
								{g.name || "Grup"}
							</h3>
							<p className='text-xs text-slate-500'>{taskCount} task</p>
						</div>
					</div>
					<button
						type='button'
						onClick={() => onOpenKanban(g.id)}
						className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-clean ring-1 ring-indigo-700/25 ${focusRing}`}
					>
						Buka papan
						<ChevronRight className='w-4 h-4' />
					</button>
					<button
						type='button'
						onClick={() => onOpenGroupChat(g.id)}
						className={`mt-2 text-xs text-slate-500 hover:text-indigo-600 font-medium rounded-md py-1 ${focusRing}`}
					>
						Ke chat grup
					</button>
				</div>
			);
		})}
	</div>
);

export default TasksHubBoardGrid;
