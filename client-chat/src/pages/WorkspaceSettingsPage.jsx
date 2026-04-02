import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
	ArrowLeft,
	Building2,
	Palette,
	Image,
	Link2,
	Copy,
	RefreshCw,
	Save,
	Upload,
	Users,
	Shield,
	Crown,
	Search,
	BarChart2,
	CreditCard,
	CheckCircle2,
	Zap,
	History,
	UserPlus,
	UserCog,
	UserX,
} from "lucide-react";
import { useDispatch } from "react-redux";
import MainShell from "../components/layout/MainShell";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import ConfirmModal from "../components/ui/ConfirmModal";
import { API_BASE } from "../lib/api";
import { useBranding } from "../hooks/useBranding";
import { workspaceService } from "../services/workspaceService";
import { onboardingPricingService } from "../services/onboardingPricingService";
import {
	clearWorkspace,
	setWorkspace,
	setWorkspaceList,
} from "../store/workspaceSlice";
import { clearRooms, fetchDashboard } from "../store/roomsSlice";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";
import { cardClean, focusRing } from "../lib/uiClasses";
import AnalyticsCharts from "../components/workspace/AnalyticsCharts";

const ROLE_LABELS = { owner: "Pemilik", admin: "Admin", member: "Anggota" };
const ROLE_COLORS = {
	owner: "bg-amber-100 text-amber-700",
	admin: "bg-indigo-100 text-indigo-700",
	member: "bg-slate-100 text-slate-600",
};

/**
 * Normalizes workspace role from API.
 * Use defaultMember for list rows (unknown → anggota). Omit for current user so null = belum dimuat.
 */
function normalizeWorkspaceRole(role, { defaultMember = false } = {}) {
	const s = String(role ?? "")
		.trim()
		.toLowerCase();
	if (s === "owner" || s === "admin" || s === "member") return s;
	return defaultMember ? "member" : null;
}

const MEMBER_PREVIEW_COUNT = 8;

function WorkspaceMemberRow({
	member: m,
	currentUserId,
	myRoleNorm,
	isSystemAdminUser,
	onPromoteAdmin,
	onDemoteMember,
	onRevokeAccess,
}) {
	const isMe = Number(m.user_id) === Number(currentUserId);
	const isSuperAdmin = !!isSystemAdminUser;
	const r = normalizeWorkspaceRole(m.role, { defaultMember: true });
	const isOwner = r === "owner";

	const canPromoteFromMember =
		!isMe &&
		!isOwner &&
		r === "member" &&
		(isSuperAdmin || myRoleNorm === "owner" || myRoleNorm === "admin");

	const canDemoteAdmin =
		!isMe &&
		!isOwner &&
		r === "admin" &&
		(isSuperAdmin || myRoleNorm === "owner");

	const canRevoke =
		!isMe &&
		!isOwner &&
		(isSuperAdmin ||
			myRoleNorm === "owner" ||
			(myRoleNorm === "admin" && r === "member"));

	return (
		<div className='flex flex-col gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors sm:flex-row sm:items-center sm:gap-3'>
			<div className='flex items-center gap-3 min-w-0 flex-1'>
				<Avatar name={m.username || m.email} size='md' />
				<div className='min-w-0 flex-1'>
					<div className='flex items-center gap-2 flex-wrap'>
						<p className='text-sm font-medium text-slate-800 truncate'>
							{m.username || m.email}
						</p>
						{isMe && (
							<span className='text-xs text-slate-400 shrink-0'>(Kamu)</span>
						)}
					</div>
					<p className='text-xs text-slate-400 truncate'>{m.email}</p>
				</div>
			</div>

			<div className='flex flex-col gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:items-end sm:shrink-0'>
				<div className='flex flex-wrap items-center justify-end gap-2'>
					{isOwner ? (
						<span className='flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700'>
							<Crown className='w-3 h-3' />
							Pemilik
						</span>
					) : (
						<span
							className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
								ROLE_COLORS[r] || ROLE_COLORS.member
							}`}
						>
							{r === "admin" && <Shield className='w-3 h-3' />}
							{ROLE_LABELS[r] || r}
						</span>
					)}
				</div>
				{(canPromoteFromMember || canDemoteAdmin || canRevoke) && (
					<div className='flex flex-wrap items-stretch sm:justify-end gap-2'>
						{canPromoteFromMember && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => onPromoteAdmin(m.user_id)}
								className='flex-1 sm:flex-none min-h-10'
							>
								<Shield className='w-3.5 h-3.5 shrink-0' />
								Jadikan admin
							</Button>
						)}
						{canDemoteAdmin && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => onDemoteMember(m.user_id)}
								className='flex-1 sm:flex-none min-h-10'
							>
								Turunkan ke anggota
							</Button>
						)}
						{canRevoke && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => onRevokeAccess(m.user_id)}
								className='flex-1 sm:flex-none min-h-10 border-rose-200 text-rose-700 hover:bg-rose-50'
							>
								<UserX className='w-3.5 h-3.5 shrink-0' />
								Cabut akses
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

const SETTINGS_TABS = ["branding", "members", "analytics", "subscription"];
const MEMBER_SUB_VIEWS = ["list", "invite"];

const ALL_WORKSPACE_TAB_DEFS = [
	{ id: "branding", label: "Branding", icon: Building2 },
	{ id: "members", label: "Anggota", icon: Users },
	{ id: "analytics", label: "Analitik", icon: BarChart2 },
	{ id: "subscription", label: "Langganan", icon: CreditCard },
];

function initialSettingsTab() {
	try {
		const t = new URLSearchParams(window.location.search).get("tab");
		return SETTINGS_TABS.includes(t) ? t : "branding";
	} catch {
		return "branding";
	}
}

export default function WorkspaceSettingsPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const dispatch = useDispatch();
	const { user } = useAuth();
	const { on } = useSocket();
	const { logoURL, workspace } = useBranding();

	const [activeTab, setActiveTab] = useState(initialSettingsTab);

	// Branding
	const [form, setForm] = useState({
		custom_name: workspace?.custom_name ?? "",
		primary_color: workspace?.primary_color ?? "#6366f1",
		description: workspace?.description ?? "",
	});
	const [savingBranding, setSavingBranding] = useState(false);
	const [logoPreview, setLogoPreview] = useState(logoURL);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [invite, setInvite] = useState(workspace?.invite_token ?? "");
	const [regenerating, setRegenerating] = useState(false);
	const logoRef = useRef(null);

	// Analytics
	const [analytics, setAnalytics] = useState(null);
	const [loadingAnalytics, setLoadingAnalytics] = useState(false);

	// Subscription
	const [subscription, setSubscription] = useState(null);
	const [loadingSubscription, setLoadingSubscription] = useState(false);
	const [pricingPlans, setPricingPlans] = useState([]);
	const [paymentTransactions, setPaymentTransactions] = useState([]);
	const [loadingPaymentTx, setLoadingPaymentTx] = useState(false);

	// Members
	const [members, setMembers] = useState([]);
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [memberSearch, setMemberSearch] = useState("");
	const [memberRoleFilter, setMemberRoleFilter] = useState("all");
	const [membersSubView, setMembersSubView] = useState("list");
	const [removingId, setRemovingId] = useState(null);
	const [myRole, setMyRole] = useState(null); // null until we fetch my role
	const [roleLoading, setRoleLoading] = useState(true);
	const [leavingWorkspace, setLeavingWorkspace] = useState(false);
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	const isSystemAdminUser = !!user?.is_system_admin;
	const myRoleNorm = normalizeWorkspaceRole(myRole);
	const canManageWorkspace =
		isSystemAdminUser || myRoleNorm === "owner" || myRoleNorm === "admin";

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await workspaceService.getCurrent();
				const r = res?.data?.data?.my_role;
				if (!cancelled) setMyRole(r && String(r).trim() ? r : null);
			} catch {
				if (!cancelled) setMyRole(null);
			} finally {
				if (!cancelled) setRoleLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const t = searchParams.get("tab");
		if (t && SETTINGS_TABS.includes(t)) setActiveTab(t);
	}, [searchParams]);

	useEffect(() => {
		if (activeTab !== "members") return;
		const v = searchParams.get("memberView");
		if (canManageWorkspace && v === "invite" && MEMBER_SUB_VIEWS.includes(v)) {
			setMembersSubView("invite");
		} else {
			setMembersSubView("list");
		}
	}, [activeTab, searchParams, canManageWorkspace]);

	// Anggota biasa: hanya tab Anggota (tanpa branding / analitik / langganan)
	useEffect(() => {
		if (roleLoading || canManageWorkspace) return;
		if (activeTab !== "members") setActiveTab("members");
	}, [roleLoading, canManageWorkspace, activeTab]);

	useEffect(() => {
		if (activeTab === "members") loadMembers();
		else if (activeTab === "branding" && canManageWorkspace) loadMembers();
		if (activeTab === "analytics") loadAnalytics();
		if (activeTab === "subscription") {
			loadSubscription({ refresh: true });
			loadPaymentTransactions();
		}
	}, [activeTab, canManageWorkspace]); // eslint-disable-line react-hooks/exhaustive-deps

	const loadAnalytics = async () => {
		if (analytics) return; // already loaded
		setLoadingAnalytics(true);
		try {
			const res = await workspaceService.getAnalytics();
			setAnalytics(res.data.data.analytics);
		} catch {
			toast.error("Gagal memuat analitik");
		} finally {
			setLoadingAnalytics(false);
		}
	};

	const loadSubscription = async ({ refresh = false } = {}) => {
		if (!refresh && subscription != null) return;
		setLoadingSubscription(true);
		try {
			const [subRes, plansRes] = await Promise.all([
				workspaceService.getSubscription(),
				pricingPlans.length === 0
					? onboardingPricingService.list()
					: Promise.resolve(null),
			]);
			setSubscription(subRes.data.data.subscription);
			if (plansRes) {
				const items = plansRes?.data?.data;
				setPricingPlans(Array.isArray(items) ? items : []);
			}
		} catch {
			toast.error("Gagal memuat informasi langganan");
		} finally {
			setLoadingSubscription(false);
		}
	};

	const loadPaymentTransactions = useCallback(async () => {
		setLoadingPaymentTx(true);
		try {
			const res = await workspaceService.listPaymentTransactions();
			setPaymentTransactions(res?.data?.data?.transactions || []);
		} catch {
			toast.error("Gagal memuat riwayat transaksi");
			setPaymentTransactions([]);
		} finally {
			setLoadingPaymentTx(false);
		}
	}, []);

	const loadMembers = useCallback(
		async ({ silent } = {}) => {
			if (!silent) setLoadingMembers(true);
			try {
				const res = await workspaceService.listMembers();
				const list = res.data.data.members || [];
				setMembers(list);
				const me = list.find((m) => Number(m.user_id) === Number(user?.id));
				if (me) setMyRole(me.role);
				else setMyRole(null);
			} catch {
				if (!silent) toast.error("Gagal memuat anggota");
			} finally {
				if (!silent) setLoadingMembers(false);
			}
		},
		[user?.id],
	);

	useEffect(() => {
		return on("workspace_members_refresh", (msg) => {
			if (!workspace?.slug || msg.workspace_slug !== workspace.slug) return;
			loadMembers({ silent: true });
		});
	}, [on, workspace?.slug, loadMembers]);

	useEffect(() => {
		return on("workspace_subscription_refresh", async (msg) => {
			if (!workspace?.slug || msg.workspace_slug !== workspace.slug) return;
			setLoadingSubscription(true);
			try {
				const subRes = await workspaceService.getSubscription();
				setSubscription(subRes.data.data.subscription);
			} catch {
				toast.error("Gagal memuat informasi langganan");
			} finally {
				setLoadingSubscription(false);
			}
			await loadPaymentTransactions();
		});
	}, [on, workspace?.slug, loadPaymentTransactions]);

	const handleRoleChange = async (userId, newRole) => {
		try {
			await workspaceService.updateMemberRole(userId, newRole);
			setMembers((prev) =>
				prev.map((m) =>
					Number(m.user_id) === Number(userId) ? { ...m, role: newRole } : m,
				),
			);
			toast.success("Role diperbarui");
		} catch {
			toast.error("Gagal mengubah role");
		}
	};

	const handleRemoveMember = async () => {
		if (!removingId) return;
		try {
			await workspaceService.removeMember(removingId);
			setMembers((prev) =>
				prev.filter((m) => Number(m.user_id) !== Number(removingId)),
			);
			toast.success("Anggota dihapus");
		} catch {
			toast.error("Gagal menghapus anggota");
		} finally {
			setRemovingId(null);
		}
	};

	const handleLeaveWorkspace = async () => {
		// Owner cannot leave from backend.
		if (myRoleNorm !== "admin" && myRoleNorm !== "member") return;
		setLeaveConfirmOpen(false);
		setLeavingWorkspace(true);
		try {
			await workspaceService.leave();
			toast.success("Berhasil keluar dari workspace");

			dispatch(clearRooms());

			const res = await workspaceService.listMine();
			const wsList = res?.data?.data?.workspaces || [];
			if (wsList.length > 0) {
				dispatch(setWorkspace(wsList[0]));
				dispatch(setWorkspaceList(wsList));
				await dispatch(fetchDashboard());
				navigate("/dashboard");
			} else {
				dispatch(clearWorkspace());
				navigate("/onboarding");
			}
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal keluar dari workspace");
		} finally {
			setLeavingWorkspace(false);
		}
	};

	const filteredMembers = members.filter((m) => {
		const q = memberSearch.toLowerCase();
		const matchesSearch =
			!q ||
			m.username?.toLowerCase().includes(q) ||
			m.email?.toLowerCase().includes(q);
		const role = normalizeWorkspaceRole(m.role, { defaultMember: true });
		const matchesRole = memberRoleFilter === "all" || role === memberRoleFilter;
		return matchesSearch && matchesRole;
	});

	const membersPreviewList = useMemo(
		() =>
			[...members]
				.sort((a, b) =>
					String(a.username || a.email || "").localeCompare(
						String(b.username || b.email || ""),
						"id",
					),
				)
				.slice(0, MEMBER_PREVIEW_COUNT),
		[members],
	);

	const memberSubTabs = [
		{
			id: "list",
			label: "Kelola anggota",
			short: "Kelola",
			Icon: UserCog,
		},
		{
			id: "invite",
			label: "Undangan",
			short: "Undangan",
			Icon: UserPlus,
		},
	];

	// Branding handlers
	const handleChange = (e) => {
		setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
	};

	const handleSaveBranding = async () => {
		setSavingBranding(true);
		try {
			const res = await workspaceService.updateBranding(form);
			const updated = res.data.data.workspace;
			dispatch(setWorkspace(updated));
			toast.success("Branding tersimpan");
		} catch {
			toast.error("Gagal menyimpan branding");
		} finally {
			setSavingBranding(false);
		}
	};

	const handleLogoChange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setLogoPreview(URL.createObjectURL(file));
		setUploadingLogo(true);
		try {
			const res = await workspaceService.uploadLogo(file);
			const updated = res.data.data.workspace;
			dispatch(setWorkspace(updated));
			toast.success("Logo berhasil diupload");
		} catch {
			setLogoPreview(logoURL);
			toast.error("Gagal upload logo");
		} finally {
			setUploadingLogo(false);
		}
	};

	const handleRegenerateInvite = async () => {
		setRegenerating(true);
		try {
			const res = await workspaceService.regenerateInvite();
			setInvite(res.data.data.invite_token);
			toast.success("Link invite diperbarui");
		} catch {
			toast.error("Gagal memperbarui link invite");
		} finally {
			setRegenerating(false);
		}
	};

	useEffect(() => {
		if (workspace?.invite_token) setInvite(workspace.invite_token);
	}, [workspace?.invite_token]);

	useEffect(() => {
		if (
			activeTab !== "members" ||
			membersSubView !== "invite" ||
			!canManageWorkspace
		)
			return;
		if (invite) return;
		let cancelled = false;
		(async () => {
			try {
				const res = await workspaceService.getInvite();
				const t = res?.data?.data?.invite_token;
				if (!cancelled && t) setInvite(t);
			} catch {
				/* ignore */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [activeTab, membersSubView, canManageWorkspace, invite]);

	const inviteLink = `${window.location.origin}/onboarding?invite=${invite}`;

	const handleCopyInviteLink = async () => {
		if (!invite) {
			toast.error("Belum ada token undangan");
			return;
		}
		try {
			await navigator.clipboard.writeText(inviteLink);
			toast.success("Link undangan disalin");
		} catch {
			toast.error("Gagal menyalin link");
		}
	};

	const goMembersSubView = (sub) => {
		if (!MEMBER_SUB_VIEWS.includes(sub)) return;
		if (!canManageWorkspace) {
			setMembersSubView("list");
			return;
		}
		setMembersSubView(sub);
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev);
				p.set("tab", "members");
				if (sub === "list") p.delete("memberView");
				else p.set("memberView", sub);
				return p;
			},
			{ replace: true },
		);
	};

	const goToMembersTab = useCallback(() => {
		setActiveTab("members");
		setMembersSubView("list");
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev);
				p.set("tab", "members");
				p.delete("memberView");
				return p;
			},
			{ replace: true },
		);
	}, [setSearchParams]);

	const membersTabOnly = useMemo(
		() => ALL_WORKSPACE_TAB_DEFS.filter((t) => t.id === "members"),
		[],
	);
	const visibleTabs = useMemo(() => {
		if (roleLoading || !canManageWorkspace) return membersTabOnly;
		return ALL_WORKSPACE_TAB_DEFS;
	}, [roleLoading, canManageWorkspace, membersTabOnly]);

	const resolvedLogo = logoPreview
		? logoPreview.startsWith("blob:") || logoPreview.startsWith("http")
			? logoPreview
			: `${API_BASE}${logoPreview}`
		: null;

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto'>
				<div className='sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-clean backdrop-blur-md sm:px-6 sm:py-4 sm:gap-4 pt-[max(0.625rem,env(safe-area-inset-top))]'>
					<button
						type='button'
						onClick={() => navigate(-1)}
						aria-label='Kembali'
						className={`min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div className='min-w-0 flex-1'>
						<h1 className='text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate'>
							Pengaturan workspace
						</h1>
						<p className='text-xs text-slate-500 mt-0.5 truncate font-mono'>
							{workspace?.slug}
						</p>
					</div>
				</div>

				<div className='overflow-x-auto border-b border-slate-200/80 bg-white/95 backdrop-blur-sm [-webkit-overflow-scrolling:touch] scrollbar-light'>
					<div
						className='flex w-max min-w-full gap-0 px-2 sm:px-6 sm:w-auto sm:min-w-0'
						role='tablist'
						aria-label='Bagian pengaturan'
					>
						{visibleTabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									type='button'
									key={tab.id}
									role='tab'
									aria-selected={activeTab === tab.id}
									onClick={() => {
										setActiveTab(tab.id);
										setSearchParams(
											(prev) => {
												const p = new URLSearchParams(prev);
												p.set("tab", tab.id);
												if (tab.id !== "members") p.delete("memberView");
												return p;
											},
											{ replace: true },
										);
									}}
									className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${focusRing} rounded-t-lg ${
										activeTab === tab.id
											? "border-indigo-600 text-indigo-600"
											: "border-transparent text-slate-500 hover:text-slate-700"
									}`}
								>
									<Icon className='w-4 h-4 shrink-0' />
									<span className='whitespace-nowrap'>{tab.label}</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className='mx-auto w-full max-w-3xl flex-1 space-y-6 sm:space-y-8 px-3 py-5 sm:px-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]'>
					{activeTab === "branding" && (
						<>
							{/* Logo */}
							<section className={`${cardClean} p-4 sm:p-6`}>
								<div className='flex items-center gap-3 mb-5'>
									<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center'>
										<Image className='w-5 h-5 text-indigo-600' />
									</div>
									<div>
										<h2 className='text-sm font-semibold text-slate-800'>
											Logo
										</h2>
										<p className='text-xs text-slate-400'>
											PNG, JPG, SVG atau WebP. Maks 2 MB.
										</p>
									</div>
								</div>

								<div className='flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-5'>
									<div
										className='w-20 h-20 rounded-2xl flex items-center justify-center shadow-clean overflow-hidden flex-shrink-0 border border-slate-200/80'
										style={{ backgroundColor: form.primary_color }}
									>
										{resolvedLogo ? (
											<img
												src={resolvedLogo}
												alt='logo'
												className='w-full h-full object-cover'
											/>
										) : (
											<Logo size={36} variant='white' />
										)}
									</div>
									<div className='flex flex-col gap-2 w-full sm:w-auto'>
										<input
											ref={logoRef}
											type='file'
											accept='image/png,image/jpeg,image/svg+xml,image/webp'
											className='hidden'
											onChange={handleLogoChange}
										/>
										<Button
											variant='outline'
											size='sm'
											onClick={() => logoRef.current?.click()}
											disabled={uploadingLogo}
											className='flex items-center justify-center gap-2 w-full sm:w-auto'
										>
											<Upload className='w-4 h-4' />
											{uploadingLogo ? "Mengupload..." : "Upload Logo"}
										</Button>
										<p className='text-xs text-slate-400'>
											Digunakan di sidebar dan halaman login.
										</p>
									</div>
								</div>
							</section>

							{/* Branding fields */}
							<section className={`${cardClean} p-4 sm:p-6 space-y-5`}>
								<div className='flex items-center gap-3 mb-1'>
									<div className='w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center'>
										<Building2 className='w-5 h-5 text-violet-600' />
									</div>
									<div>
										<h2 className='text-sm font-semibold text-slate-800'>
											Identitas Brand
										</h2>
										<p className='text-xs text-slate-400'>
											Nama dan deskripsi yang tampil ke pengguna.
										</p>
									</div>
								</div>

								<div className='space-y-1'>
									<label className='text-xs font-medium text-slate-500'>
										Nama Tampilan
									</label>
									<Input
										name='custom_name'
										placeholder={workspace?.name ?? "Nama workspace"}
										value={form.custom_name}
										onChange={handleChange}
									/>
									<p className='text-xs text-slate-400'>
										Kosongkan untuk menggunakan nama workspace asli:{" "}
										<strong>{workspace?.name}</strong>
									</p>
								</div>

								<div className='space-y-1'>
									<label className='text-xs font-medium text-slate-500'>
										Deskripsi
									</label>
									<textarea
										name='description'
										placeholder='Deskripsi singkat workspace...'
										value={form.description}
										onChange={handleChange}
										rows={3}
										className='w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent resize-none transition-all'
									/>
								</div>

								{/* Color picker */}
								<div className='space-y-2'>
									<div className='flex items-center gap-2'>
										<Palette className='w-4 h-4 text-slate-400' />
										<label className='text-xs font-medium text-slate-500'>
											Warna Utama
										</label>
									</div>
									<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3'>
										<input
											type='color'
											name='primary_color'
											value={form.primary_color}
											onChange={handleChange}
											className='w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0'
										/>
										<Input
											name='primary_color'
											value={form.primary_color}
											onChange={handleChange}
											placeholder='#6366f1'
											className='font-mono text-sm min-w-0 flex-1'
										/>
									</div>
									<div className='flex gap-2 flex-wrap'>
										{[
											"#6366f1",
											"#0ea5e9",
											"#10b981",
											"#f59e0b",
											"#ef4444",
											"#8b5cf6",
											"#ec4899",
											"#14b8a6",
										].map((c) => (
											<button
												type='button'
												key={c}
												aria-label={`Warna ${c}`}
												onClick={() =>
													setForm((f) => ({ ...f, primary_color: c }))
												}
												className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${focusRing}`}
												style={{
													backgroundColor: c,
													borderColor:
														form.primary_color === c
															? "#1e293b"
															: "transparent",
												}}
											/>
										))}
									</div>
								</div>

								<div className='pt-2'>
									<Button
										onClick={handleSaveBranding}
										disabled={savingBranding}
										className='flex w-full items-center justify-center gap-2 sm:w-auto'
									>
										<Save className='w-4 h-4' />
										{savingBranding ? "Menyimpan..." : "Simpan Branding"}
									</Button>
								</div>
							</section>

							{canManageWorkspace && (
								<section className={`${cardClean} p-4 sm:p-6`}>
									<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4'>
										<div className='flex items-center gap-3 min-w-0'>
											<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0'>
												<Users className='w-5 h-5 text-indigo-600' />
											</div>
											<div className='min-w-0'>
												<h2 className='text-sm font-semibold text-slate-800'>
													Anggota workspace
												</h2>
												<p className='text-xs text-slate-400'>
													{members.length} orang · jadikan admin atau cabut
													akses
												</p>
											</div>
										</div>
										<Button
											type='button'
											variant='outline'
											size='sm'
											onClick={goToMembersTab}
											className='w-full shrink-0 sm:w-auto'
										>
											Kelola semua
										</Button>
									</div>

									{loadingMembers ? (
										<div className='flex justify-center py-8'>
											<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
										</div>
									) : membersPreviewList.length === 0 ? (
										<p className='text-sm text-slate-400 text-center py-6'>
											Belum ada anggota
										</p>
									) : (
										<div className='space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-1'>
											{membersPreviewList.map((m) => (
												<WorkspaceMemberRow
													key={m.user_id}
													member={m}
													currentUserId={user?.id}
													myRoleNorm={myRoleNorm}
													isSystemAdminUser={isSystemAdminUser}
													onPromoteAdmin={(userId) =>
														handleRoleChange(userId, "admin")
													}
													onDemoteMember={(userId) =>
														handleRoleChange(userId, "member")
													}
													onRevokeAccess={(userId) => setRemovingId(userId)}
												/>
											))}
										</div>
									)}

									{members.length > MEMBER_PREVIEW_COUNT && (
										<p className='text-xs text-slate-400 mt-3 text-center'>
											Menampilkan {MEMBER_PREVIEW_COUNT} dari {members.length}{" "}
											anggota.{" "}
											<button
												type='button'
												onClick={goToMembersTab}
												className={`font-medium text-indigo-600 hover:text-indigo-700 ${focusRing} rounded`}
											>
												Buka tab Anggota
											</button>{" "}
											untuk daftar lengkap.
										</p>
									)}
								</section>
							)}
						</>
					)}

					{activeTab === "members" && (
						<section className={`${cardClean} p-4 sm:p-6`}>
							<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 mb-5'>
								<div className='flex items-center gap-3 min-w-0 flex-1'>
									<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0'>
										<Users className='w-5 h-5 text-indigo-600' />
									</div>
									<div className='min-w-0'>
										<h2 className='text-sm font-semibold text-slate-800'>
											Anggota Workspace
										</h2>
										<p className='text-xs text-slate-400'>
											{members.length} anggota
										</p>
									</div>
								</div>
								{myRoleNorm && myRoleNorm !== "owner" && (
									<Button
										type='button'
										variant='secondary'
										loading={leavingWorkspace}
										disabled={leavingWorkspace}
										onClick={() => setLeaveConfirmOpen(true)}
										className='w-full shrink-0 text-rose-600 hover:text-rose-700 sm:w-auto sm:ml-auto'
									>
										Keluar
									</Button>
								)}
							</div>

							{canManageWorkspace && (
								<div
									className='flex rounded-xl bg-slate-100/90 p-1 gap-1 mb-5'
									role='tablist'
									aria-label='Sub bagian anggota'
								>
									{memberSubTabs.map(({ id, label, short, Icon }) => {
										const active = membersSubView === id;
										return (
											<button
												key={id}
												type='button'
												role='tab'
												aria-selected={active}
												onClick={() => goMembersSubView(id)}
												className={`flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition-colors ${focusRing} ${
													active
														? "bg-white text-indigo-700 shadow-sm"
														: "text-slate-600 hover:text-slate-800"
												}`}
											>
												<Icon className='w-4 h-4 shrink-0' />
												<span className='truncate sm:hidden'>{short}</span>
												<span className='truncate hidden sm:inline'>
													{label}
												</span>
											</button>
										);
									})}
								</div>
							)}

							{canManageWorkspace && membersSubView === "invite" ? (
								<div className='space-y-4'>
									<div className='rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-3'>
										<div className='flex items-start gap-2'>
											<Link2 className='w-4 h-4 text-indigo-600 shrink-0 mt-0.5' />
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-medium text-slate-800'>
													Link undangan
												</p>
												<p className='text-xs text-slate-500 mt-0.5'>
													Bagikan ke calon anggota. Mereka akan bergabung lewat
													halaman onboarding.
												</p>
											</div>
										</div>
										<div className='flex flex-col gap-2 sm:flex-row sm:items-stretch'>
											<input
												readOnly
												value={invite ? inviteLink : "Memuat token…"}
												className='flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-mono text-slate-700'
											/>
											<div className='flex gap-2 shrink-0'>
												<Button
													type='button'
													variant='outline'
													size='sm'
													onClick={handleCopyInviteLink}
													disabled={!invite}
													className='flex-1 sm:flex-none items-center justify-center gap-1.5'
												>
													<Copy className='w-4 h-4' />
													Salin
												</Button>
												<Button
													type='button'
													variant='secondary'
													size='sm'
													loading={regenerating}
													disabled={regenerating}
													onClick={handleRegenerateInvite}
													className='flex-1 sm:flex-none items-center justify-center gap-1.5'
												>
													<RefreshCw className='w-4 h-4' />
													Baru
												</Button>
											</div>
										</div>
									</div>
								</div>
							) : (
								<>
									{/* Search */}
									<div className='relative mb-3'>
										<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
										<input
											type='text'
											placeholder='Cari anggota...'
											value={memberSearch}
											onChange={(e) => setMemberSearch(e.target.value)}
											className='w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-slate-50'
										/>
									</div>

									<div className='flex flex-wrap gap-2 mb-4'>
										{[
											{ id: "all", label: "Semua" },
											{ id: "owner", label: "Pemilik" },
											{ id: "admin", label: "Admin" },
											{ id: "member", label: "Anggota" },
										].map(({ id, label }) => (
											<button
												key={id}
												type='button'
												onClick={() => setMemberRoleFilter(id)}
												className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${focusRing} ${
													memberRoleFilter === id
														? "border-indigo-600 bg-indigo-50 text-indigo-800"
														: "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
												}`}
											>
												{label}
											</button>
										))}
									</div>

									{loadingMembers ? (
										<div className='flex justify-center py-8'>
											<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
										</div>
									) : (
										<div className='space-y-2'>
											{filteredMembers.map((m) => (
												<WorkspaceMemberRow
													key={m.user_id}
													member={m}
													currentUserId={user?.id}
													myRoleNorm={myRoleNorm}
													isSystemAdminUser={isSystemAdminUser}
													onPromoteAdmin={(userId) =>
														handleRoleChange(userId, "admin")
													}
													onDemoteMember={(userId) =>
														handleRoleChange(userId, "member")
													}
													onRevokeAccess={(userId) => setRemovingId(userId)}
												/>
											))}
											{filteredMembers.length === 0 && (
												<p className='text-sm text-slate-400 text-center py-6'>
													{memberSearch || memberRoleFilter !== "all"
														? "Anggota tidak ditemukan"
														: "Belum ada anggota"}
												</p>
											)}
										</div>
									)}
								</>
							)}
						</section>
					)}
					{activeTab === "analytics" && (
						<section className={`${cardClean} p-4 sm:p-6`}>
							<div className='flex items-center gap-3 mb-6'>
								<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0'>
									<BarChart2 className='w-5 h-5 text-indigo-600' />
								</div>
								<div className='min-w-0'>
									<h2 className='text-sm font-semibold text-slate-800'>
										Analitik Workspace
									</h2>
									<p className='text-xs text-slate-400'>
										Statistik penggunaan workspace
									</p>
								</div>
							</div>

							{loadingAnalytics ? (
								<div className='flex justify-center py-12'>
									<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
								</div>
							) : analytics ? (
								<AnalyticsCharts analytics={analytics} />
							) : (
								<p className='text-sm text-slate-400 text-center py-8'>
									Tidak ada data analitik
								</p>
							)}
						</section>
					)}
					{activeTab === "subscription" && (
						<div className='space-y-5 sm:space-y-6'>
							{/* Current plan */}
							<section className={`${cardClean} p-4 sm:p-6`}>
								<div className='flex items-center gap-3 mb-6'>
									<div className='w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0'>
										<CreditCard className='w-5 h-5 text-amber-600' />
									</div>
									<div className='min-w-0'>
										<h2 className='text-sm font-semibold text-slate-800'>
											Paket Langganan
										</h2>
										<p className='text-xs text-slate-400'>
											Informasi paket dan batas penggunaan
										</p>
									</div>
								</div>

								{loadingSubscription ? (
									<div className='flex justify-center py-8'>
										<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
									</div>
								) : subscription ? (
									<div className='space-y-4'>
										<div className='flex flex-col gap-3 p-4 bg-slate-50 rounded-xl sm:flex-row sm:items-center sm:gap-3'>
											<Zap className='w-5 h-5 text-amber-500 shrink-0' />
											<div className='min-w-0 flex-1'>
												<p className='text-xs text-slate-500'>Paket Aktif</p>
												<p className='text-base font-bold text-slate-800 capitalize'>
													{subscription.plan}
												</p>
											</div>
											<span
												className={`self-start text-xs font-medium px-2.5 py-1 rounded-full sm:self-center sm:ml-auto ${
													subscription.status === "active"
														? "bg-emerald-100 text-emerald-700"
														: "bg-rose-100 text-rose-700"
												}`}
											>
												{subscription.status === "active"
													? "Aktif"
													: subscription.status}
											</span>
										</div>
										<div className='flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-sm'>
											<span className='text-slate-500'>Batas Anggota</span>
											<span className='font-medium text-slate-800'>
												{subscription.member_limit === -1
													? "Tidak terbatas"
													: `${subscription.member_limit} anggota`}
											</span>
										</div>
										{subscription.expires_at && (
											<div className='flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-sm'>
												<span className='text-slate-500'>Berakhir</span>
												<span className='font-medium text-slate-800'>
													{new Date(subscription.expires_at).toLocaleDateString(
														"id-ID",
													)}
												</span>
											</div>
										)}
									</div>
								) : (
									<p className='text-sm text-slate-400 text-center py-4'>
										Tidak ada data langganan
									</p>
								)}
							</section>

							<section className={`${cardClean} p-4 sm:p-6`}>
								<div className='flex items-center gap-3 mb-4'>
									<div className='w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0'>
										<History className='w-5 h-5 text-slate-600' />
									</div>
									<div className='min-w-0'>
										<h2 className='text-sm font-semibold text-slate-800'>
											Riwayat transaksi
										</h2>
										<p className='text-xs text-slate-400'>
											Midtrans otomatis disetujui setelah pembayaran sukses;
											manual menunggu admin.
										</p>
									</div>
								</div>
								{loadingPaymentTx ? (
									<div className='flex justify-center py-8'>
										<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
									</div>
								) : paymentTransactions.length === 0 ? (
									<p className='text-sm text-slate-400 text-center py-4'>
										Belum ada transaksi.
									</p>
								) : (
									<div className='overflow-x-auto rounded-xl border border-slate-100'>
										<table className='w-full text-xs sm:text-sm text-left min-w-[640px]'>
											<thead>
												<tr className='border-b border-slate-200 bg-slate-50 text-slate-500'>
													<th className='px-3 py-2 font-medium'>Order</th>
													<th className='px-3 py-2 font-medium'>Paket</th>
													<th className='px-3 py-2 font-medium'>Nominal</th>
													<th className='px-3 py-2 font-medium'>Saluran</th>
													<th className='px-3 py-2 font-medium'>Bukti / bank</th>
													<th className='px-3 py-2 font-medium'>Status</th>
												</tr>
											</thead>
											<tbody>
												{paymentTransactions.map((t) => (
													<tr
														key={t.id}
														className='border-b border-slate-100 last:border-0'
													>
														<td className='px-3 py-2 font-mono text-[10px] sm:text-xs text-slate-500 max-w-[120px] truncate'>
															{t.order_id}
														</td>
														<td className='px-3 py-2 capitalize'>
															{t.plan_key}
														</td>
														<td className='px-3 py-2'>
															Rp{" "}
															{new Intl.NumberFormat("id-ID").format(
																t.amount_idr,
															)}
														</td>
														<td className='px-3 py-2'>
															{t.channel === "midtrans" ? "Midtrans" : "Manual"}
														</td>
														<td className='px-3 py-2 text-slate-600 max-w-[200px]'>
															{t.channel === "manual" &&
															(t.manual_proof_image_url ||
																t.manual_payer_bank_name) ? (
																<div className='space-y-0.5'>
																	{t.manual_payer_bank_name && (
																		<p className='text-[10px] sm:text-xs truncate'>
																			{t.manual_payer_bank_name}
																		</p>
																	)}
																	{t.manual_payer_account_digits && (
																		<p
																			className='font-mono text-[10px] sm:text-xs text-slate-500 truncate'
																			title={t.manual_payer_account_digits}
																		>
																			Rek: {t.manual_payer_account_digits}
																		</p>
																	)}
																	{t.manual_proof_image_url && (
																		<a
																			href={`${API_BASE}${t.manual_proof_image_url}`}
																			target='_blank'
																			rel='noopener noreferrer'
																			className={`text-indigo-600 hover:underline text-[10px] sm:text-xs font-medium ${focusRing} rounded`}
																		>
																			Lihat bukti
																		</a>
																	)}
																</div>
															) : (
																<span className='text-slate-400'>—</span>
															)}
														</td>
														<td className='px-3 py-2'>
															<span
																className={`font-medium px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
																	t.status === "pending"
																		? "bg-amber-100 text-amber-800"
																		: t.status === "approved"
																		? "bg-emerald-100 text-emerald-800"
																		: "bg-slate-100 text-slate-600"
																}`}
															>
																{t.status === "pending"
																	? "Menunggu"
																	: t.status === "approved"
																	? "Disetujui"
																	: t.status === "rejected"
																	? "Ditolak"
																	: t.status === "expired"
																	? "Kedaluwarsa"
																	: t.status === "canceled"
																	? "Dibatalkan"
																	: t.status}
															</span>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</section>

							{/* Plan comparison — from onboarding pricing API */}
							{pricingPlans.length > 0 && (
								<section className={`${cardClean} p-4 sm:p-6`}>
									<h3 className='text-sm font-semibold text-slate-800 mb-4'>
										Perbandingan Paket
									</h3>
									<div className='grid w-full grid-cols-1 gap-4'>
										{pricingPlans.map((plan, idx) => {
											const isCurrent = subscription?.plan === plan.key;
											const isFree =
												plan.price_idr === 0 || plan.key === "free";
											const isHighlight = !isFree && idx === 1;
											const priceLabel = isFree
												? "Gratis"
												: plan.price_idr > 0
												? `Rp ${new Intl.NumberFormat("id-ID").format(
														plan.price_idr,
												  )}${plan.interval ? ` / ${plan.interval}` : ""}`
												: "Hubungi kami";
											return (
												<div
													key={plan.key}
													className={`p-4 rounded-2xl border-2 transition-all ${
														isCurrent
															? "border-indigo-500 bg-indigo-50/50"
															: isHighlight
															? "border-indigo-200 bg-white"
															: "border-slate-200 bg-white"
													}`}
												>
													{isCurrent && (
														<span className='text-xs font-semibold text-indigo-600 flex items-center gap-1 mb-2'>
															<CheckCircle2 className='w-3.5 h-3.5' />
															Paket kamu
														</span>
													)}
													<p className='font-bold text-slate-800'>
														{plan.title}
													</p>
													{plan.description && (
														<p className='text-xs text-slate-500 mt-0.5'>
															{plan.description}
														</p>
													)}
													<p className='text-xs font-medium text-indigo-600 mt-1 mb-3'>
														{priceLabel}
													</p>
													{Array.isArray(plan.features) &&
														plan.features.length > 0 && (
															<ul className='space-y-1.5'>
																{plan.features.map((f) => (
																	<li
																		key={f}
																		className='flex items-start gap-1.5 text-xs text-slate-600'
																	>
																		<CheckCircle2 className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5' />
																		{f}
																	</li>
																))}
															</ul>
														)}
													{!isFree && !isCurrent && (
														<div className='mt-4 space-y-2'>
															<button
																type='button'
																onClick={() =>
																	navigate(
																		`/payment?plan=${encodeURIComponent(plan.key)}&channel=midtrans`,
																	)
																}
																className={`w-full py-2 rounded-xl text-xs font-medium transition-colors ${focusRing} ${
																	isHighlight
																		? "bg-indigo-600 text-white hover:bg-indigo-700"
																		: "border border-slate-200 text-slate-700 hover:bg-slate-50"
																}`}
															>
																Upgrade (Midtrans)
															</button>
															{canManageWorkspace && (
																<button
																	type='button'
																	onClick={() =>
																		navigate(
																			`/payment?plan=${encodeURIComponent(plan.key)}&channel=manual`,
																		)
																	}
																	className={`w-full py-2 rounded-xl text-xs font-medium border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors ${focusRing}`}
																>
																	Ajukan bayar manual (transfer)
																</button>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
									<p className='text-xs text-slate-400 mt-4 text-center'>
										Upgrade dan bayar manual membuka halaman detail pembayaran
										(form manual & Midtrans di sana). Pertanyaan billing:{" "}
										<a
											href='mailto:sales@zync.chat'
											className='text-indigo-600 hover:underline'
										>
											sales@zync.chat
										</a>
									</p>
								</section>
							)}
						</div>
					)}
				</div>
			</div>

			<ConfirmModal
				isOpen={!!removingId}
				onClose={() => setRemovingId(null)}
				onConfirm={handleRemoveMember}
				title='Cabut akses'
				confirmLabel='Cabut akses'
				message='Anggota ini akan dikeluarkan dari workspace dan tidak bisa mengakses chat, file, atau board di sini.'
			/>
			<ConfirmModal
				isOpen={leaveConfirmOpen}
				onClose={() => setLeaveConfirmOpen(false)}
				onConfirm={handleLeaveWorkspace}
				title='Keluar dari Workspace'
				confirmLabel='Keluar'
				confirmVariant='danger'
				loading={leavingWorkspace}
				message='Aksi ini akan menghapus akun kamu dari workspace ini. Kamu tidak bisa chat di workspace tersebut.'
			/>
		</MainShell>
	);
}
