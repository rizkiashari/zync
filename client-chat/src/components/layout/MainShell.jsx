import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";

/**
 * App chrome: sidebar (desktop tetap / mobile drawer) + tab bar bawah di mobile.
 */
export default function MainShell({ children, showBottomNav = true }) {
	return (
		<div className='flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-slate-50'>
			<Sidebar />
			<div
				className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
					showBottomNav ?
						"pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0"
					:	""
				}`}
			>
				<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
					{children}
				</div>
				{showBottomNav && <MobileBottomNav />}
			</div>
		</div>
	);
}
