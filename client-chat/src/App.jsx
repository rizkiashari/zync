import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import GroupChatPage from "./pages/GroupChatPage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import KanbanPage from "./pages/KanbanPage";
import TasksPage from "./pages/TasksPage";
import CallPage from "./pages/CallPage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import IncomingCallModal from "./components/call/IncomingCallModal";

const LoadingScreen = () => (
	<div className='min-h-screen bg-slate-50 flex items-center justify-center'>
		<div className='flex flex-col items-center gap-3'>
			<div className='w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
			<p className='text-slate-500 text-sm'>Memuat...</p>
		</div>
	</div>
);

// Route for unauthenticated users only
const PublicRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return null;
	return user ? <Navigate to='/dashboard' replace /> : children;
};

// Route for authenticated users — if no workspace yet, send to onboarding
const ProtectedRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const workspace = useSelector((s) => s.workspace.current);
	if (loading) return <LoadingScreen />;
	if (!user) return <Navigate to='/login' replace />;
	if (!workspace) return <Navigate to='/onboarding' replace />;
	return children;
};

// Route for authenticated users who don't need a workspace (profile, etc.)
const AuthRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return <LoadingScreen />;
	return user ? children : <Navigate to='/login' replace />;
};

// System admin maintenance (needs workspace like other app areas)
const AdminRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const workspace = useSelector((s) => s.workspace.current);
	if (loading) return <LoadingScreen />;
	if (!user) return <Navigate to='/login' replace />;
	if (!workspace) return <Navigate to='/onboarding' replace />;
	if (!user.is_system_admin) return <Navigate to='/dashboard' replace />;
	return children;
};

function App() {
	return (
		<>
			<Toaster
				position='top-right'
				toastOptions={{
					duration: 3000,
					style: { borderRadius: "12px", fontSize: "14px", fontWeight: "500" },
					success: { iconTheme: { primary: "#4f46e5", secondary: "#fff" } },
				}}
			/>
			<IncomingCallModal />
			<Routes>
				{/* Public routes */}
				<Route path='/login' element={<PublicRoute><LoginPage /></PublicRoute>} />
				<Route path='/register' element={<PublicRoute><RegisterPage /></PublicRoute>} />
				<Route path='/forgot-password' element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

				{/* Onboarding — needs auth but no workspace yet */}
				<Route path='/onboarding' element={<AuthRoute><OnboardingPage /></AuthRoute>} />

				{/* Workspace-scoped protected routes */}
				<Route path='/dashboard' element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
				<Route path='/tasks' element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
				<Route path='/chat/:roomId' element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
				<Route path='/group/:groupId' element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
				<Route path='/group/:groupId/kanban' element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
				<Route path='/call/:roomId' element={<ProtectedRoute><CallPage /></ProtectedRoute>} />

				{/* Auth-only routes (no workspace required) */}
				<Route path='/profile' element={<AuthRoute><ProfilePage /></AuthRoute>} />
				<Route path='/change-password' element={<AuthRoute><ChangePasswordPage /></AuthRoute>} />

				{/* Workspace settings */}
				<Route path='/workspace/settings' element={<ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>} />

				<Route path='/admin/users' element={<AdminRoute><AdminUsersPage /></AdminRoute>} />

				{/* Redirects */}
				<Route path='/' element={<Navigate to='/dashboard' replace />} />
				<Route path='*' element={<Navigate to='/dashboard' replace />} />
			</Routes>
		</>
	);
}

export default App;
