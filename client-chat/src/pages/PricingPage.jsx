import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MainShell from "../components/layout/MainShell";
import Button from "../components/ui/Button";
import { cardClean, focusRing } from "../lib/uiClasses";
import { onboardingHighlightFeatures as features } from "../data/onboardingHighlights";
import { onboardingPricingService } from "../services/onboardingPricingService";
import { useAuth } from "../context/AuthContext";

const isRecommendedPlan = (plan) => plan?.key === "pro";

export default function PricingPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const workspace = useSelector((s) => s.workspace.current);

	const [active, setActive] = useState("realtime");
	const activeFeature = useMemo(
		() => features.find((f) => f.key === active) || features[0],
		[active],
	);

	const [pricingPlans, setPricingPlans] = useState([]);
	const [pricingLoading, setPricingLoading] = useState(true);

	const isWorkspaceOwner = useMemo(
		() =>
			!!workspace && !!user && Number(workspace.owner_id) === Number(user.id),
		[workspace, user],
	);

	const workspaceDisplayName = workspace?.custom_name || workspace?.name || "";

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setPricingLoading(true);
			try {
				const res = await onboardingPricingService.list();
				const items = res?.data?.data || [];
				if (!cancelled) setPricingPlans(Array.isArray(items) ? items : []);
			} catch {
				if (!cancelled) setPricingPlans([]);
			} finally {
				if (!cancelled) setPricingLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const formatIDR = (n) => {
		if (typeof n !== "number") return "0";
		return new Intl.NumberFormat("id-ID").format(n);
	};

	const subscribePlan = useMemo(() => {
		if (!pricingPlans.length) return null;
		return pricingPlans.find((p) => isRecommendedPlan(p)) || pricingPlans[0];
	}, [pricingPlans]);

	return (
		<MainShell>
			<div className='min-h-0 flex-1 overflow-y-auto scrollbar-light'>
				<section className='relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 overflow-hidden min-h-[min(100%,520px)]'>
					<div className='absolute -top-10 -right-10 w-56 h-56 bg-white/5 rounded-full' />
					<div className='absolute top-4 right-32 w-20 h-20 bg-white/5 rounded-full' />
					<div className='absolute -bottom-8 left-40 w-40 h-40 bg-white/5 rounded-full' />

					<div className='relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-10 flex flex-col gap-6'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
							<div>
								<p className='text-indigo-200 text-sm font-medium'>
									Harga & informasi
								</p>
								<h1 className='text-white text-2xl font-bold leading-tight mt-1'>
									Langganan & highlight produk
								</h1>
							</div>
							<button
								type='button'
								onClick={() => navigate("/dashboard")}
								className={`self-start sm:self-auto flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-all hover:bg-white/20 ${focusRing}`}
							>
								Kembali ke dashboard
							</button>
						</div>

						<div
							className={`${cardClean} bg-white/10 border-white/20 shadow-none backdrop-blur-md`}
						>
							<div className='flex items-center justify-between gap-4 flex-wrap p-4 border-b border-white/15'>
								<div>
									<p className='text-white/90 text-sm font-semibold'>
										Mode onboarding iklan
									</p>
									<p className='text-white/70 text-xs mt-0.5'>
										Pilih highlight yang kamu peduli sekarang.
									</p>
								</div>
								<div className='flex gap-2 flex-wrap'>
									{features.map((f) => {
										const Icon = f.icon;
										const isActive = active === f.key;
										return (
											<button
												key={f.key}
												type='button'
												onClick={() => setActive(f.key)}
												className={`inline-flex items-center px-3 py-2.5 min-h-11 rounded-xl text-xs font-semibold border transition-all ${
													isActive ?
														"bg-white/15 border-white/30 text-white shadow-clean-md"
													:	"bg-white/5 border-white/15 text-white/75 hover:bg-white/10"
												}`}
												aria-pressed={isActive}
											>
												<span className='inline-flex items-center gap-2'>
													<Icon className='w-3.5 h-3.5' />
													{f.key === "realtime" ?
														"Real-time"
													: f.key === "tenant" ?
														"Aman"
													:	"Task Hub"}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							<div className='p-4 flex gap-4 items-start'>
								<div className='w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0'>
									{(() => {
										const Icon = activeFeature.icon;
										return (
											<Icon className='w-5 h-5 text-white' aria-hidden='true' />
										);
									})()}
								</div>
								<div>
									<p className='text-white font-semibold'>
										{activeFeature.title}
									</p>
									<p className='text-white/70 text-sm mt-0.5 leading-relaxed'>
										{activeFeature.desc}
									</p>
								</div>
							</div>
						</div>

						<div
							className={`${cardClean} bg-white/10 border-white/20 shadow-none backdrop-blur-md overflow-hidden`}
						>
							<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 border-b border-white/15'>
								<div className='min-w-0'>
									<p className='text-white/90 text-sm font-semibold'>
										Langganan
									</p>
									<p className='text-white/70 text-xs mt-0.5'>
										{isWorkspaceOwner ?
											"Tingkatkan atau kelola paket workspace Anda."
										:	"Anda bergabung sebagai anggota workspace ini."}
									</p>
									{isWorkspaceOwner && workspaceDisplayName && (
										<span className='inline-flex mt-2 text-[11px] font-semibold text-indigo-100 bg-indigo-500/20 border border-indigo-200/30 px-2.5 py-1 rounded-full max-w-full truncate'>
											Workspace · {workspaceDisplayName}
										</span>
									)}
								</div>
							</div>

							<div className='p-4'>
								{isWorkspaceOwner ?
									<>
										{pricingLoading ?
											<div
												className='h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse'
												aria-busy
												aria-live='polite'
											/>
										: subscribePlan ?
											<div className='rounded-2xl border border-indigo-200/40 bg-indigo-500/10 p-4 mb-4'>
												<p className='text-xs font-semibold text-white'>
													{subscribePlan.title}
												</p>
												<p className='text-sm text-white/85 mt-1'>
													{formatIDR(subscribePlan.price_idr)} /
													<span className='text-white/70'>
														{" "}
														{subscribePlan.interval}
													</span>
												</p>
											</div>
										:	<p className='text-sm text-white/75 mb-4'>
												Belum ada paket publik. Kelola langganan di pengaturan
												workspace.
											</p>
										}
										<Button
											type='button'
											variant='primary'
											size='md'
											fullWidth
											onClick={() =>
												navigate("/workspace/settings?tab=subscription")
											}
											className='!min-h-11 bg-indigo-900/2 text-indigo-700 hover:bg-indigo-50'
										>
											Berlangganan
										</Button>
									</>
								:	<p className='text-sm text-white/75 leading-relaxed'>
										Pengelolaan paket dan pembayaran dilakukan oleh pemilik
										workspace. Hubungi pemilik jika perlu peningkatan fitur.
									</p>
								}
							</div>
						</div>
					</div>
				</section>
			</div>
		</MainShell>
	);
}
