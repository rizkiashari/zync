import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Hash, ArrowRight, Link } from "lucide-react";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceService } from "../services/workspaceService";
import { useAuth } from "../context/AuthContext";
import { useCanCreateWorkspace } from "../hooks/useCanCreateWorkspace";
import OnboardingPricingAdminPanel from "../components/pricing/OnboardingPricingAdminPanel";
import toast from "react-hot-toast";
import { isNativeApp } from "../lib/platform";

const nativeFont =
	"font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] [-webkit-tap-highlight-color:transparent]";

function slugify(s) {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 30);
}

const OnboardingPage = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { switchWorkspace } = useWorkspace();
	const { user } = useAuth();
	const isSystemAdmin = !!user?.is_system_admin;
	const { canCreateWorkspace, roleLoading, roleReady } =
		useCanCreateWorkspace();
	const [tab, setTab] = useState("create"); // 'create' | 'join'
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugManual, setSlugManual] = useState(false);
	const [inviteToken, setInviteToken] = useState("");
	const [loading, setLoading] = useState(false);

	// Invite token or explicit tab from URL (?tab=create | ?tab=join)
	useEffect(() => {
		const token = searchParams.get("invite");
		const tabParam = searchParams.get("tab");
		if (token) {
			setInviteToken(token);
			setTab("join");
			return;
		}
		if (tabParam === "join" || tabParam === "create") {
			if (tabParam === "create" && roleReady && !canCreateWorkspace) {
				setTab("join");
				toast.error(
					"Sebagai anggota, kamu tidak bisa membuat workspace. Gunakan undangan (tab Gabung).",
				);
			} else {
				setTab(tabParam);
			}
		}
	}, [searchParams, roleReady, canCreateWorkspace]);

	// Stay on Gabung if role loads and user is member-only
	useEffect(() => {
		if (!roleReady || canCreateWorkspace) return;
		if (tab === "create") setTab("join");
	}, [roleReady, canCreateWorkspace, tab]);

	const handleNameChange = (e) => {
		setName(e.target.value);
		if (!slugManual) setSlug(slugify(e.target.value));
	};

	const handleSlugChange = (e) => {
		setSlugManual(true);
		setSlug(slugify(e.target.value));
	};

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!canCreateWorkspace) {
			toast.error(
				"Anggota tidak dapat membuat workspace. Minta undangan ke admin.",
			);
			return;
		}
		if (!name.trim()) return toast.error("Nama workspace wajib diisi");
		setLoading(true);
		try {
			const res = await workspaceService.create(
				name.trim(),
				slug || slugify(name),
			);
			const ws = res.data.data.workspace;
			switchWorkspace(ws);
			toast.success(`Workspace "${ws.name}" berhasil dibuat!`);
			navigate("/dashboard");
		} catch (err) {
			toast.error(
				err?.response?.data?.error?.message || "Gagal membuat workspace",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleJoin = async (e) => {
		e.preventDefault();
		if (!inviteToken.trim()) return toast.error("Token invite wajib diisi");
		setLoading(true);
		try {
			const res = await workspaceService.join(inviteToken);
			const ws = res.data.data.workspace;
			switchWorkspace(ws);
			toast.success(`Berhasil bergabung ke "${ws.name}"!`);
			navigate("/dashboard");
		} catch (err) {
			if (err?.message === "missing_invite_token") {
				toast.error("Token invite wajib diisi");
			} else {
				toast.error(err?.response?.data?.error?.message || "Token tidak valid");
			}
		} finally {
			setLoading(false);
		}
	};

	const tabFocus =
		"focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

	const maxWidthClass = useMemo(
		() => (isSystemAdmin ? "max-w-5xl" : "max-w-md"),
		[isSystemAdmin],
	);
	const native = isNativeApp();

	const tabBtn = (active) =>
		native
			? `flex-1 py-3.5 text-[15px] font-semibold rounded-xl transition-colors ${tabFocus} ${
					active ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400"
			  }`
			: `flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${tabFocus} ${
					active
						? "bg-indigo-600 text-white shadow-clean"
						: "text-slate-400 hover:text-slate-200"
			  }`;

	const fieldShell = native
		? "w-full pl-9 pr-4 py-3.5 bg-zinc-900 text-zinc-100 placeholder-zinc-500 rounded-xl text-[16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border border-zinc-800"
		: "w-full pl-9 pr-4 py-2.5 bg-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border border-slate-600";

	return (
		<div
			className={
				native
					? `${nativeFont} relative min-h-dvh overflow-x-hidden overflow-y-auto bg-zinc-950 text-zinc-100 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]`
					: `relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6`
			}
		>
			{!native && (
				<>
					<div className='absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl' />
					<div className='absolute -bottom-28 -right-28 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-2xl' />
				</>
			)}

			<main
				className={`w-full z-10 relative ${
					native ? "max-w-lg mx-auto" : maxWidthClass
				}`}
				aria-labelledby='onboarding-title'
			>
				<header
					className={
						native
							? "text-left mb-6"
							: "flex flex-col items-center text-center mb-8 sm:mb-10"
					}
				>
					<div
						className={
							native
								? "w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40 mb-4"
								: "w-16 h-16 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-clean-md ring-1 ring-white/10 mb-4"
						}
					>
						<Logo size={native ? 32 : 36} variant='white' />
					</div>
					<h1
						id='onboarding-title'
						className={
							native
								? "text-[28px] font-bold text-white tracking-tight leading-tight"
								: "text-2xl font-bold text-white tracking-tight"
						}
					>
						{native ? "Workspace baru" : "Selamat datang di Zync"}
					</h1>
					<p
						className={
							native
								? "text-zinc-400 text-[16px] mt-2 leading-relaxed max-w-[40ch]"
								: "text-slate-400 text-sm mt-2 leading-relaxed max-w-[42ch]"
						}
					>
						{native
							? "Buat atau gabung — alur singkat, tanpa halaman web panjang."
							: roleReady && !canCreateWorkspace
								? "Gabung dengan undangan dari admin workspace."
								: "Buat atau bergabung ke workspace untuk memulai"}
					</p>
				</header>

				<div
					className={
						isSystemAdmin
							? "grid gap-6 lg:grid-cols-2 lg:items-start"
							: "space-y-4"
					}
				>
					<div className='space-y-4'>
						<div
							className={
								native
									? "flex w-full rounded-2xl bg-zinc-900 p-1 ring-1 ring-zinc-800"
									: "flex bg-slate-800/90 rounded-2xl p-1 ring-1 ring-white/5"
							}
							role='tablist'
							aria-label='Mode workspace'
						>
							<button
								type='button'
								role='tab'
								aria-selected={tab === "create"}
								disabled={roleLoading || !canCreateWorkspace}
								title={
									!canCreateWorkspace && roleReady ?
										"Hanya pemilik atau admin workspace yang bisa membuat workspace baru"
									:	undefined
								}
								onClick={() => {
									if (!canCreateWorkspace && roleReady) {
										toast.error(
											"Anggota tidak dapat membuat workspace. Gunakan undangan.",
										);
										return;
									}
									setTab("create");
								}}
								className={`${tabBtn(tab === "create")} ${roleLoading || !canCreateWorkspace ? "opacity-50 cursor-not-allowed" : ""}`}
							>
								Buat
							</button>
							<button
								type='button'
								role='tab'
								aria-selected={tab === "join"}
								onClick={() => setTab("join")}
								className={tabBtn(tab === "join")}
							>
								Gabung
							</button>
						</div>

						<section
							className={
								native
									? "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
									: "bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md shadow-clean-md"
							}
							aria-label='Form onboarding workspace'
						>
							{tab === "create" && !canCreateWorkspace && roleReady ? (
								<p
									className={
										native ?
											"text-[15px] text-zinc-400 leading-relaxed"
										:	"text-sm text-slate-400 leading-relaxed"
									}
								>
									Peran kamu di workspace ini adalah anggota. Untuk workspace
									baru, minta admin mengundang atau mengubah peran kamu.
								</p>
							) : tab === "create" ? (
								<form
									onSubmit={handleCreate}
									className='space-y-5'
									aria-label='Buat workspace baru'
								>
									<div>
										<label
											className={
												native
													? "block text-[13px] font-medium text-zinc-400 mb-2"
													: "block text-sm font-medium text-slate-200 mb-1.5"
											}
										>
											Nama Workspace
										</label>
										<div className='relative'>
											<Building2
												className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
													native ? "text-zinc-500" : "text-slate-400"
												}`}
											/>
											<input
												type='text'
												placeholder='Contoh: PT Maju Jaya'
												value={name}
												onChange={handleNameChange}
												autoComplete='organization'
												className={fieldShell}
												required
											/>
										</div>
									</div>

									<div>
										<label
											className={
												native
													? "block text-[13px] font-medium text-zinc-400 mb-2"
													: "block text-sm font-medium text-slate-200 mb-1.5"
											}
										>
											Slug
											<span
												className={
													native
														? "text-zinc-600 font-normal"
														: "text-slate-500 font-normal"
												}
											>
												{" "}
												(URL workspace)
											</span>
										</label>
										<div className='relative'>
											<Hash
												className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
													native ? "text-zinc-500" : "text-slate-400"
												}`}
											/>
											<input
												type='text'
												placeholder='pt-maju-jaya'
												value={slug}
												onChange={handleSlugChange}
												autoComplete='off'
												className={fieldShell}
											/>
										</div>
										{slug && (
											<p
												className={
													native
														? "text-[12px] text-zinc-500 mt-1.5"
														: "text-xs text-slate-500 mt-1"
												}
											>
												Workspace ID:{" "}
												<span className='text-indigo-400 font-mono'>
													{slug}
												</span>
											</p>
										)}
									</div>

									<Button
										type='submit'
										fullWidth
										size='lg'
										loading={loading}
										className={
											native
												? "mt-3 h-12 rounded-2xl text-[17px] font-semibold"
												: "mt-2"
										}
									>
										<span className='flex items-center gap-2'>
											Buat Workspace <ArrowRight className='w-4 h-4' />
										</span>
									</Button>
								</form>
							) : (
								<form
									onSubmit={handleJoin}
									className='space-y-5'
									aria-label='Gabung dengan token invite'
								>
									<div>
										<label
											className={
												native
													? "block text-[13px] font-medium text-zinc-400 mb-2"
													: "block text-sm font-medium text-slate-200 mb-1.5"
											}
										>
											Token Invite
										</label>
										<div className='relative'>
											<Link
												className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
													native ? "text-zinc-500" : "text-slate-400"
												}`}
											/>
											<input
												type='text'
												placeholder='Token invite atau tempel link lengkap (?invite=…)'
												value={inviteToken}
												onChange={(e) => setInviteToken(e.target.value)}
												autoComplete='one-time-code'
												className={fieldShell}
												required
											/>
										</div>
										<p
											className={
												native
													? "text-[12px] text-zinc-500 mt-2 leading-relaxed"
													: "text-xs text-slate-500 mt-1"
											}
										>
											Minta token invite dari admin workspace yang ingin kamu
											gabungi.
										</p>
									</div>

									<Button
										type='submit'
										fullWidth
										size='lg'
										loading={loading}
										className={
											native
												? "mt-3 h-12 rounded-2xl text-[17px] font-semibold"
												: "mt-2"
										}
									>
										<span className='flex items-center gap-2'>
											Gabung Workspace <ArrowRight className='w-4 h-4' />
										</span>
									</Button>
								</form>
							)}
						</section>
					</div>

					{isSystemAdmin && (
						<div className='lg:pt-2'>
							<OnboardingPricingAdminPanel />
						</div>
					)}
				</div>

				<footer
					className={
						native
							? "text-center text-[11px] text-zinc-600 mt-10 pb-2"
							: "text-center text-xs text-slate-600 mt-8"
					}
				>
					© 2026 Zync
				</footer>
			</main>
		</div>
	);
};

export default OnboardingPage;
