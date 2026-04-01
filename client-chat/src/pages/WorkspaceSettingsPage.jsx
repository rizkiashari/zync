import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	Building2,
	Palette,
	Image,
	Link2,
	RefreshCw,
	Save,
	Upload,
	Users,
	Shield,
	Crown,
	Trash2,
	Search,
	BarChart2,
	CreditCard,
	CheckCircle2,
	Zap,
} from "lucide-react";
import { useDispatch } from "react-redux";
import Sidebar from "../components/layout/Sidebar";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useBranding } from "../hooks/useBranding";
import { workspaceService } from "../services/workspaceService";
import {
	clearWorkspace,
	setWorkspace,
	setWorkspaceList,
} from "../store/workspaceSlice";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { API_BASE } from "../lib/api";
import { cardClean, focusRing } from "../lib/uiClasses";
import AnalyticsCharts from "../components/workspace/AnalyticsCharts";

const ROLE_LABELS = { owner: "Pemilik", admin: "Admin", member: "Anggota" };
const ROLE_COLORS = {
	owner: "bg-amber-100 text-amber-700",
	admin: "bg-indigo-100 text-indigo-700",
	member: "bg-slate-100 text-slate-600",
};

export default function WorkspaceSettingsPage() {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { user } = useAuth();
	const { logoURL, workspace } = useBranding();

	const [activeTab, setActiveTab] = useState("branding");

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

	// Members
	const [members, setMembers] = useState([]);
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [memberSearch, setMemberSearch] = useState("");
	const [removingId, setRemovingId] = useState(null);
	const [myRole, setMyRole] = useState(null); // null until we fetch my role
	const [leavingWorkspace, setLeavingWorkspace] = useState(false);
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	useEffect(() => {
		if (activeTab === "members") loadMembers();
		if (activeTab === "analytics") loadAnalytics();
		if (activeTab === "subscription") loadSubscription();
	}, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

	const loadSubscription = async () => {
		if (subscription) return;
		setLoadingSubscription(true);
		try {
			const res = await workspaceService.getSubscription();
			setSubscription(res.data.data.subscription);
		} catch {
			toast.error("Gagal memuat informasi langganan");
		} finally {
			setLoadingSubscription(false);
		}
	};

	const loadMembers = async () => {
		setLoadingMembers(true);
		try {
			const res = await workspaceService.listMembers();
			const list = res.data.data.members || [];
			setMembers(list);
			const me = list.find((m) => Number(m.user_id) === Number(user?.id));
			if (me) setMyRole(me.role);
			else setMyRole(null);
		} catch {
			toast.error("Gagal memuat anggota");
		} finally {
			setLoadingMembers(false);
		}
	};

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
		if (!myRole || myRole === "owner") return;
		setLeaveConfirmOpen(false);
		setLeavingWorkspace(true);
		try {
			await workspaceService.leave();
			toast.success("Berhasil keluar dari workspace");

			// Choose another workspace if available.
			const res = await workspaceService.listMine();
			const wsList = res?.data?.data?.workspaces || [];
			if (wsList.length > 0) {
				dispatch(setWorkspace(wsList[0]));
				dispatch(setWorkspaceList(wsList));
				navigate("/dashboard");
			} else {
				dispatch(clearWorkspace());
				navigate("/onboarding");
			}
		} catch {
			toast.error("Gagal keluar dari workspace");
		} finally {
			setLeavingWorkspace(false);
		}
	};

	const filteredMembers = members.filter((m) => {
		const q = memberSearch.toLowerCase();
		return (
			m.username?.toLowerCase().includes(q) ||
			m.email?.toLowerCase().includes(q)
		);
	});

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

	const inviteLink = `${window.location.origin}/onboarding?invite=${invite}`;

	const resolvedLogo =
		logoPreview ?
			logoPreview.startsWith("blob:") || logoPreview.startsWith("http") ?
				logoPreview
			:	`${API_BASE}${logoPreview}`
		:	null;

	const tabs = [
		{ id: "branding", label: "Branding", icon: Building2 },
		{ id: "members", label: "Anggota", icon: Users },
		{ id: "analytics", label: "Analitik", icon: BarChart2 },
		{ id: "subscription", label: "Langganan", icon: CreditCard },
	];

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />
			<div className='flex-1 flex flex-col min-w-0 overflow-y-auto'>
				<div className='sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center gap-4 shadow-clean'>
					<button
						type='button'
						onClick={() => navigate(-1)}
						aria-label='Kembali'
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div>
						<h1 className='text-lg font-bold text-slate-900 tracking-tight'>
							Pengaturan workspace
						</h1>
						<p className='text-xs text-slate-500 mt-0.5'>{workspace?.slug}</p>
					</div>
				</div>

				<div className='border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-6'>
					<div
						className='flex gap-1'
						role='tablist'
						aria-label='Bagian pengaturan'
					>
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									type='button'
									key={tab.id}
									role='tab'
									aria-selected={activeTab === tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${focusRing} rounded-t-lg ${
										activeTab === tab.id ?
											"border-indigo-600 text-indigo-600"
										:	"border-transparent text-slate-500 hover:text-slate-700"
									}`}
								>
									<Icon className='w-4 h-4' />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className='flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-8'>
					{activeTab === "branding" && (
						<>
							{/* Logo */}
							<section className={`${cardClean} p-6`}>
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

								<div className='flex items-center gap-5'>
									<div
										className='w-20 h-20 rounded-2xl flex items-center justify-center shadow-clean overflow-hidden flex-shrink-0 border border-slate-200/80'
										style={{ backgroundColor: form.primary_color }}
									>
										{resolvedLogo ?
											<img
												src={resolvedLogo}
												alt='logo'
												className='w-full h-full object-cover'
											/>
										:	<Logo size={36} variant='white' />}
									</div>
									<div className='flex flex-col gap-2'>
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
											className='flex items-center gap-2'
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
							<section className={`${cardClean} p-6 space-y-5`}>
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
									<div className='flex items-center gap-3'>
										<input
											type='color'
											name='primary_color'
											value={form.primary_color}
											onChange={handleChange}
											className='w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white'
										/>
										<Input
											name='primary_color'
											value={form.primary_color}
											onChange={handleChange}
											placeholder='#6366f1'
											className='font-mono text-sm'
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
														form.primary_color === c ?
															"#1e293b"
														:	"transparent",
												}}
											/>
										))}
									</div>
								</div>

								<div className='pt-2'>
									<Button
										onClick={handleSaveBranding}
										disabled={savingBranding}
										className='flex items-center gap-2'
									>
										<Save className='w-4 h-4' />
										{savingBranding ? "Menyimpan..." : "Simpan Branding"}
									</Button>
								</div>
							</section>

							{/* Invite link */}
							<section className={`${cardClean} p-6 space-y-4`}>
								<div className='flex items-center gap-3'>
									<div className='w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center'>
										<Link2 className='w-5 h-5 text-emerald-600' />
									</div>
									<div>
										<h2 className='text-sm font-semibold text-slate-800'>
											Link Invite
										</h2>
										<p className='text-xs text-slate-400'>
											Bagikan link ini agar anggota baru bisa bergabung.
										</p>
									</div>
								</div>

								<div className='flex gap-2'>
									<input
										readOnly
										value={inviteLink}
										onClick={(e) => e.target.select()}
										className='flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer font-mono truncate'
									/>
									<button
										type='button'
										onClick={() => {
											navigator.clipboard.writeText(inviteLink);
											toast.success("Link disalin!");
										}}
										className={`px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium ${focusRing}`}
									>
										Salin
									</button>
								</div>

								<Button
									variant='outline'
									size='sm'
									onClick={handleRegenerateInvite}
									disabled={regenerating}
									className='flex items-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50'
								>
									<RefreshCw className='w-4 h-4' />
									{regenerating ? "Memperbarui..." : "Buat Link Baru"}
								</Button>
								<p className='text-xs text-slate-400'>
									Membuat link baru akan menonaktifkan link lama.
								</p>
							</section>
						</>
					)}

					{activeTab === "members" && (
						<section className={`${cardClean} p-6`}>
							<div className='flex items-center gap-3 mb-5'>
								<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center'>
									<Users className='w-5 h-5 text-indigo-600' />
								</div>
								<div>
									<h2 className='text-sm font-semibold text-slate-800'>
										Anggota Workspace
									</h2>
									<p className='text-xs text-slate-400'>
										{members.length} anggota
									</p>
								</div>
								{myRole && myRole !== "owner" && (
									<div className='ml-auto'>
										<Button
											type='button'
											variant='secondary'
											loading={leavingWorkspace}
											disabled={leavingWorkspace}
											onClick={() => setLeaveConfirmOpen(true)}
											className='text-rose-600 hover:text-rose-700'
										>
											Keluar
										</Button>
									</div>
								)}
							</div>

							{/* Search */}
							<div className='relative mb-4'>
								<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
								<input
									type='text'
									placeholder='Cari anggota...'
									value={memberSearch}
									onChange={(e) => setMemberSearch(e.target.value)}
									className='w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-slate-50'
								/>
							</div>

							{loadingMembers ?
								<div className='flex justify-center py-8'>
									<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
								</div>
							:	<div className='space-y-2'>
									{filteredMembers.map((m) => {
										const isMe = Number(m.user_id) === Number(user?.id);
										const isSuperAdmin = !!user?.is_system_admin;
										const isOwner = m.role === "owner";
										const canChangeRole =
											(isSuperAdmin || myRole === "owner") && !isMe && !isOwner;
										const canRemove =
											(isSuperAdmin ||
												myRole === "owner" ||
												myRole === "admin") &&
											!isMe &&
											!isOwner;

										return (
											<div
												key={m.user_id}
												className='flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors'
											>
												<Avatar name={m.username || m.email} size='md' />
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2'>
														<p className='text-sm font-medium text-slate-800 truncate'>
															{m.username || m.email}
														</p>
														{isMe && (
															<span className='text-xs text-slate-400'>
																(Kamu)
															</span>
														)}
													</div>
													<p className='text-xs text-slate-400 truncate'>
														{m.email}
													</p>
												</div>

												<div className='flex items-center gap-2'>
													{isOwner ?
														<span className='flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700'>
															<Crown className='w-3 h-3' />
															Pemilik
														</span>
													: canChangeRole ?
														<select
															value={m.role}
															onChange={(e) =>
																handleRoleChange(m.user_id, e.target.value)
															}
															className='text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
														>
															<option value='admin'>Admin</option>
															<option value='member'>Anggota</option>
														</select>
													:	<span
															className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[m.role]}`}
														>
															{m.role === "admin" && (
																<Shield className='w-3 h-3' />
															)}
															{ROLE_LABELS[m.role] || m.role}
														</span>
													}

													{canRemove && (
														<button
															type='button'
															onClick={() => setRemovingId(m.user_id)}
															aria-label={`Hapus ${m.username || m.email} dari workspace`}
															className={`p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ${focusRing}`}
														>
															<Trash2 className='w-4 h-4' />
														</button>
													)}
												</div>
											</div>
										);
									})}
									{filteredMembers.length === 0 && (
										<p className='text-sm text-slate-400 text-center py-6'>
											{memberSearch ?
												"Anggota tidak ditemukan"
											:	"Belum ada anggota"}
										</p>
									)}
								</div>
							}
						</section>
					)}
					{activeTab === "analytics" && (
						<section className={`${cardClean} p-6`}>
							<div className='flex items-center gap-3 mb-6'>
								<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center'>
									<BarChart2 className='w-5 h-5 text-indigo-600' />
								</div>
								<div>
									<h2 className='text-sm font-semibold text-slate-800'>
										Analitik Workspace
									</h2>
									<p className='text-xs text-slate-400'>
										Statistik penggunaan workspace
									</p>
								</div>
							</div>

							{loadingAnalytics ?
								<div className='flex justify-center py-12'>
									<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
								</div>
							: analytics ?
								<AnalyticsCharts analytics={analytics} />
							:	<p className='text-sm text-slate-400 text-center py-8'>
									Tidak ada data analitik
								</p>
							}
						</section>
					)}
					{activeTab === "subscription" && (
						<div className='space-y-6'>
							{/* Current plan */}
							<section className={`${cardClean} p-6`}>
								<div className='flex items-center gap-3 mb-6'>
									<div className='w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center'>
										<CreditCard className='w-5 h-5 text-amber-600' />
									</div>
									<div>
										<h2 className='text-sm font-semibold text-slate-800'>
											Paket Langganan
										</h2>
										<p className='text-xs text-slate-400'>
											Informasi paket dan batas penggunaan
										</p>
									</div>
								</div>

								{loadingSubscription ?
									<div className='flex justify-center py-8'>
										<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
									</div>
								: subscription ?
									<div className='space-y-4'>
										<div className='flex items-center gap-3 p-4 bg-slate-50 rounded-xl'>
											<Zap className='w-5 h-5 text-amber-500' />
											<div>
												<p className='text-xs text-slate-500'>Paket Aktif</p>
												<p className='text-base font-bold text-slate-800 capitalize'>
													{subscription.plan}
												</p>
											</div>
											<span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
												subscription.status === "active"
													? "bg-emerald-100 text-emerald-700"
													: "bg-rose-100 text-rose-700"
											}`}>
												{subscription.status === "active" ? "Aktif" : subscription.status}
											</span>
										</div>
										<div className='flex items-center justify-between text-sm'>
											<span className='text-slate-500'>Batas Anggota</span>
											<span className='font-medium text-slate-800'>
												{subscription.member_limit === -1
													? "Tidak terbatas"
													: `${subscription.member_limit} anggota`}
											</span>
										</div>
										{subscription.expires_at && (
											<div className='flex items-center justify-between text-sm'>
												<span className='text-slate-500'>Berakhir</span>
												<span className='font-medium text-slate-800'>
													{new Date(subscription.expires_at).toLocaleDateString("id-ID")}
												</span>
											</div>
										)}
									</div>
								:	<p className='text-sm text-slate-400 text-center py-4'>Tidak ada data langganan</p>
								}
							</section>

							{/* Plan comparison */}
							<section className={`${cardClean} p-6`}>
								<h3 className='text-sm font-semibold text-slate-800 mb-4'>
									Perbandingan Paket
								</h3>
								<div className='grid grid-cols-3 gap-4'>
									{[
										{
											id: "free",
											name: "Free",
											price: "Gratis",
											features: ["5 anggota", "100 MB storage", "Basic chat", "Kanban board"],
										},
										{
											id: "pro",
											name: "Pro",
											price: "Hubungi kami",
											features: ["Anggota tak terbatas", "10 GB storage", "Semua fitur", "Prioritas support"],
											highlight: true,
										},
										{
											id: "enterprise",
											name: "Enterprise",
											price: "Custom",
											features: ["Custom anggota", "Storage custom", "Fitur custom", "Dedicated support"],
										},
									].map((plan) => (
										<div
											key={plan.id}
											className={`p-4 rounded-2xl border-2 transition-all ${
												subscription?.plan === plan.id
													? "border-indigo-500 bg-indigo-50/50"
													: plan.highlight
														? "border-indigo-200 bg-white"
														: "border-slate-200 bg-white"
											}`}
										>
											{subscription?.plan === plan.id && (
												<span className='text-xs font-semibold text-indigo-600 flex items-center gap-1 mb-2'>
													<CheckCircle2 className='w-3.5 h-3.5' />
													Paket kamu
												</span>
											)}
											<p className='font-bold text-slate-800'>{plan.name}</p>
											<p className='text-xs text-slate-500 mb-3'>{plan.price}</p>
											<ul className='space-y-1.5'>
												{plan.features.map((f) => (
													<li key={f} className='flex items-start gap-1.5 text-xs text-slate-600'>
														<CheckCircle2 className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5' />
														{f}
													</li>
												))}
											</ul>
											{plan.id !== "free" && subscription?.plan !== plan.id && (
												<button
													type='button'
													onClick={() => {
														const email = "sales@zync.chat";
														window.location.href = `mailto:${email}?subject=Upgrade ke paket ${plan.name}&body=Halo, saya ingin upgrade workspace saya ke paket ${plan.name}.`;
													}}
													className={`mt-4 w-full py-2 rounded-xl text-xs font-medium transition-colors ${focusRing} ${
														plan.highlight
															? "bg-indigo-600 text-white hover:bg-indigo-700"
															: "border border-slate-200 text-slate-700 hover:bg-slate-50"
													}`}
												>
													Upgrade
												</button>
											)}
										</div>
									))}
								</div>
								<p className='text-xs text-slate-400 mt-4 text-center'>
									Untuk upgrade atau pertanyaan, hubungi{" "}
									<a href='mailto:sales@zync.chat' className='text-indigo-600 hover:underline'>
										sales@zync.chat
									</a>
								</p>
							</section>
						</div>
					)}
				</div>
			</div>

			<ConfirmModal
				isOpen={!!removingId}
				onClose={() => setRemovingId(null)}
				onConfirm={handleRemoveMember}
				title='Hapus Anggota'
				message='Yakin ingin menghapus anggota ini dari workspace?'
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
		</div>
	);
}
