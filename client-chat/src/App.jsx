import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useAuth } from "./context/AuthContext";
import IncomingCallModal from "./components/call/IncomingCallModal";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AdOnboardingPage = lazy(() => import("./pages/AdOnboardingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const CallPage = lazy(() => import("./pages/CallPage"));
const WorkspaceSettingsPage = lazy(() =>
	import("./pages/WorkspaceSettingsPage"),
);
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminTransactionsPage = lazy(() =>
	import("./pages/AdminTransactionsPage"),
);
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentDetailPage = lazy(() => import("./pages/PaymentDetailPage"));

const LoadingScreen = () => (
	<div className='fixed inset-0 bg-slate-900 flex flex-col items-center justify-center gap-6'>
		<div className='flex flex-col items-center gap-4'>
			<img src='./app-icon.png' alt='Zync' className='w-24 h-24 rounded-[28px] shadow-2xl shadow-black/60' />
			<div className='text-center'>
				<p className='text-white text-2xl font-bold tracking-tight'>Zync</p>
				<p className='text-slate-400 text-sm mt-1'>Chat & workspace ringan</p>
			</div>
		</div>
		<div className='w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin' />
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
			<Suspense fallback={<LoadingScreen />}>
				<Routes>
					{/* Public routes */}
					<Route
						path='/login'
						element={
							<PublicRoute>
								<LoginPage />
							</PublicRoute>
						}
					/>
					<Route
						path='/register'
						element={
							<PublicRoute>
								<RegisterPage />
							</PublicRoute>
						}
					/>
					<Route
						path='/forgot-password'
						element={
							<PublicRoute>
								<ForgotPasswordPage />
							</PublicRoute>
						}
					/>

					{/* Onboarding — needs auth but no workspace yet */}
					<Route
						path='/onboarding'
						element={
							<AuthRoute>
								<OnboardingPage />
							</AuthRoute>
						}
					/>

					{/* Workspace-scoped protected routes */}
					<Route
						path='/dashboard'
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/tasks'
						element={
							<ProtectedRoute>
								<TasksPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/chat/:roomId'
						element={
							<ProtectedRoute>
								<ChatPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/group/:groupId'
						element={
							<ProtectedRoute>
								<GroupChatPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/group/:groupId/kanban'
						element={
							<ProtectedRoute>
								<KanbanPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/call/:roomId'
						element={
							<ProtectedRoute>
								<CallPage />
							</ProtectedRoute>
						}
					/>

					{/* Auth-only routes (no workspace required) */}
					<Route
						path='/profile'
						element={
							<AuthRoute>
								<ProfilePage />
							</AuthRoute>
						}
					/>
					<Route
						path='/change-password'
						element={
							<AuthRoute>
								<ChangePasswordPage />
							</AuthRoute>
						}
					/>

					{/* Workspace settings */}
					<Route
						path='/workspace/settings'
						element={
							<ProtectedRoute>
								<WorkspaceSettingsPage />
							</ProtectedRoute>
						}
					/>

					<Route
						path='/admin/users'
						element={
							<AdminRoute>
								<AdminUsersPage />
							</AdminRoute>
						}
					/>
					<Route
						path='/admin/transactions'
						element={
							<AdminRoute>
								<AdminTransactionsPage />
							</AdminRoute>
						}
					/>
					<Route
						path='/bookmarks'
						element={
							<ProtectedRoute>
								<BookmarksPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/files'
						element={
							<ProtectedRoute>
								<FilesPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/pricing'
						element={
							<ProtectedRoute>
								<PricingPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/payment'
						element={
							<ProtectedRoute>
								<PaymentDetailPage />
							</ProtectedRoute>
						}
					/>

					{/* Redirects */}
					<Route
						path='/'
						element={
							<PublicRoute>
								<AdOnboardingPage />
							</PublicRoute>
						}
					/>
					<Route
						path='*'
						element={
							<PublicRoute>
								<AdOnboardingPage />
							</PublicRoute>
						}
					/>
				</Routes>
			</Suspense>
		</>
	);
}

export default App;
