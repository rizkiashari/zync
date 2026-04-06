import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainShell from "../components/layout/MainShell";
import { useTasksHub } from "../hooks/useTasksHub";
import TasksHubWorkspaceSidebar from "../components/tasks/TasksHubWorkspaceSidebar";
import TasksHubToolbar from "../components/tasks/TasksHubToolbar";
import TasksHubBacklog from "../components/tasks/TasksHubBacklog";
import TasksHubListTable from "../components/tasks/TasksHubListTable";
import TasksHubBoardGrid from "../components/tasks/TasksHubBoardGrid";
import TasksHubCreateModal from "../components/tasks/TasksHubCreateModal";

const TasksPage = () => {
	const navigate = useNavigate();
	const hub = useTasksHub();
	const [showCreate, setShowCreate] = useState(false);

	const goKanban = (groupId) => navigate(`/group/${groupId}/kanban`);
	const goGroupChat = (groupId) => navigate(`/group/${groupId}`);

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row'>
				<TasksHubWorkspaceSidebar
					groupRooms={hub.groupRooms}
					workspaceId={hub.workspaceId}
					onSelectWorkspace={hub.setWorkspaceId}
				/>

				<main className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
					<TasksHubToolbar
						mainTab={hub.mainTab}
						onMainTab={hub.setMainTab}
						query={hub.query}
						onQuery={hub.setQuery}
						showDone={hub.showDone}
						onShowDone={hub.setShowDone}
						canCreateTask={hub.groupRooms.length > 0}
						onCreateTask={() => setShowCreate(true)}
					/>

					<div className='flex-1 overflow-y-auto p-4 sm:p-6'>
						{hub.loading && (
							<div className='flex justify-center py-20'>
								<div className='w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
							</div>
						)}

						{!hub.loading && hub.groupRooms.length === 0 && (
							<p className='text-center text-slate-500 text-sm py-16'>
								Buat grup dulu untuk mulai melacak task.
							</p>
						)}

						{!hub.loading &&
							hub.groupRooms.length > 0 &&
							hub.mainTab === "backlog" && (
								<TasksHubBacklog
									sections={hub.backlogSections}
									onOpenKanban={goKanban}
									onMoveTask={hub.moveTaskToSection}
								/>
							)}

						{!hub.loading &&
							hub.groupRooms.length > 0 &&
							hub.mainTab === "list" && (
								<TasksHubListTable
									rows={hub.listRows}
									onOpenKanban={goKanban}
									onMoveTask={hub.moveTaskToSection}
								/>
							)}

						{!hub.loading &&
							hub.groupRooms.length > 0 &&
							hub.mainTab === "boards" && (
								<TasksHubBoardGrid
									groupRooms={hub.visibleGroupRooms}
									boardsByRoomId={hub.boardsByRoomId}
									onOpenKanban={goKanban}
									onOpenGroupChat={goGroupChat}
								/>
							)}
					</div>
				</main>
			</div>
		{showCreate && (
			<TasksHubCreateModal
				groupRooms={hub.groupRooms}
				boardsByRoomId={hub.boardsByRoomId}
				onClose={() => setShowCreate(false)}
				onCreated={() => hub.refetchBoards({ quiet: true })}
			/>
		)}
		</MainShell>
	);
};

export default TasksPage;
