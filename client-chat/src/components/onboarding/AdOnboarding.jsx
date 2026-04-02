import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageCircle, Blocks, Sparkles } from "lucide-react";
import Logo from "../ui/Logo";
import Button from "../ui/Button";
import { cardClean, focusRing } from "../../lib/uiClasses";
import Avatar from "../ui/Avatar";
import { onboardingPricingService } from "../../services/onboardingPricingService";
import { onboardingHighlightFeatures as features } from "../../data/onboardingHighlights";
import { isNativeApp } from "../../lib/platform";
import {
	AdOnboardingDashboardNative,
	AdOnboardingGuestNative,
} from "./adOnboardingNativeLayouts";

const getFirstName = (name) => {
	if (!name) return "dunia";
	return name.split(" ")[0] || name;
};

export default function AdOnboarding({
	variant = "guest", // 'guest' | 'dashboard'
	user,
	onCreateGroup,
	onGoTasks,
	onGoPricing,
	onGoLogin,
	onGoRegister,
	onSkipToContent,
}) {
	const [active, setActive] = useState("realtime");
	const activeFeature = useMemo(
		() => features.find((f) => f.key === active) || features[0],
		[active],
	);

	const [pricingPlans, setPricingPlans] = useState([]);
	const [pricingLoading, setPricingLoading] = useState(true);

	const needPricing = variant === "guest";

	useEffect(() => {
		let cancelled = false;
		if (!needPricing) {
			setPricingPlans([]);
			setPricingLoading(false);
			return;
		}
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
	}, [needPricing]);

	const formatIDR = (n) => {
		if (typeof n !== "number") return "0";
		return new Intl.NumberFormat("id-ID").format(n);
	};

	const isRecommended = (plan) => plan?.key === "pro";

	if (variant === "dashboard") {
		if (isNativeApp()) {
			return (
				<AdOnboardingDashboardNative
					user={user}
					onCreateGroup={onCreateGroup}
					onGoTasks={onGoTasks}
					onGoPricing={onGoPricing}
					onSkipToContent={onSkipToContent}
				/>
			);
		}
		return (
			<section className='relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 overflow-hidden'>
				<div className='absolute -top-10 -right-10 w-56 h-56 bg-white/5 rounded-full' />
				<div className='absolute top-4 right-32 w-20 h-20 bg-white/5 rounded-full' />
				<div className='absolute -bottom-8 left-40 w-40 h-40 bg-white/5 rounded-full' />

				<div className='relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8 sm:pb-10 flex flex-col gap-6'>
					<div className='flex items-start justify-between gap-6 flex-wrap'>
						<div className='flex items-center gap-4'>
							<div className='ring-4 ring-white/20 rounded-full'>
								<Avatar
									name={user?.username || user?.name || "Zync"}
									size='xl'
									online={true}
								/>
							</div>
							<div>
								<p className='text-indigo-200 text-sm mb-0.5'>
									Selamat datang kembali
								</p>
								<h1 className='text-white text-2xl font-bold leading-tight'>
									{getFirstName(user?.username || user?.name)}!
								</h1>
							</div>
						</div>

						<div className='flex flex-wrap items-center gap-2'>
							<Button
								type='button'
								variant='primary'
								size='md'
								onClick={onGoTasks}
								className='bg-indigo-900/20 text-white hover:bg-indigo-900/30 border border-white/30 shadow-clean-md'
							>
								<Blocks className='w-4 h-4' />
								Task Hub
							</Button>
							<Button
								type='button'
								variant='primary'
								size='md'
								onClick={onCreateGroup}
								className='bg-indigo-900/20 text-white hover:bg-indigo-900/30 border border-white/30 shadow-clean-md'
							>
								<Sparkles className='w-4 h-4' />
								Grup Baru
							</Button>
							<button
								type='button'
								onClick={onGoPricing}
								disabled={!onGoPricing}
								className={`flex items-center gap-2 bg-white text-indigo-700 text-sm font-semibold px-4 py-2 rounded-xl border border-white/90 transition-all hover:bg-indigo-50 disabled:opacity-50 disabled:pointer-events-none ${focusRing}`}
							>
								Harga & langganan
								<ArrowRight className='w-4 h-4' />
							</button>
							<button
								type='button'
								onClick={onSkipToContent}
								className={`flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-all hover:bg-white/20 ${focusRing}`}
							>
								Lihat dashboard
								<ArrowRight className='w-4 h-4' />
							</button>
						</div>
					</div>
				</div>
			</section>
		);
	}

	// Guest (public marketing entry point)
	if (isNativeApp()) {
		return (
			<AdOnboardingGuestNative
				active={active}
				setActive={setActive}
				activeFeature={activeFeature}
				features={features}
				pricingPlans={pricingPlans}
				pricingLoading={pricingLoading}
				formatIDR={formatIDR}
				isRecommended={isRecommended}
				onGoLogin={onGoLogin}
				onGoRegister={onGoRegister}
			/>
		);
	}

	return (
		<div
			className='flex min-h-dvh w-full max-w-[100vw] flex-col items-stretch overflow-x-hidden bg-slate-50 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] text-slate-900'
			style={{
				backgroundImage:
					"radial-gradient(1200px 800px at 20% 5%, rgba(99,102,241,0.14), transparent 60%), radial-gradient(900px 600px at 80% 0%, rgba(236,72,153,0.10), transparent 55%), radial-gradient(800px 500px at 50% 90%, rgba(56,189,248,0.10), transparent 60%)",
			}}
		>
			<div className='flex w-full min-w-0 flex-col'>
				<header className='px-4 pt-4 sm:px-6 sm:pt-6'>
					<div className='max-w-6xl mx-auto flex items-center justify-between gap-4'>
						<div className='flex items-center gap-3'>
							<div className='w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-clean-md ring-1 ring-black/5 flex items-center justify-center'>
								<Logo size={28} variant='white' />
							</div>
							<div>
								<p className='text-sm font-semibold text-slate-900'>Zync</p>
								<p className='text-xs text-slate-500 mt-0.5'>
									Onboarding iklan untuk mulai chat
								</p>
							</div>
						</div>
						<div className='flex gap-2'>
							<Button
								type='button'
								variant='secondary'
								onClick={onGoLogin}
								className='hidden sm:inline-flex'
							>
								Masuk
							</Button>
							<Button type='button' variant='primary' onClick={onGoRegister}>
								Daftar
							</Button>
						</div>
					</div>
				</header>

				<main className='flex-1 px-4 py-8 sm:px-6 sm:py-10'>
					<div className='mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 lg:grid-cols-2'>
						<section
							className={`${cardClean} p-7 shadow-clean-md bg-white/70 backdrop-blur-md overflow-hidden relative flex flex-col h-full`}
						>
							<div className='absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full' />
							<div className='absolute top-10 left-6 w-24 h-24 bg-fuchsia-500/10 rounded-full' />
							<div className='relative'>
								<h1 className='mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl sm:leading-[1.05]'>
									Zync bikin chat terasa cepat,
									<br />
									terasa aman, terasa rapi.
								</h1>
								<p className='mt-4 text-slate-600 text-base leading-relaxed max-w-[45ch]'>
									Real-time messaging + kontrol workspace. Kamu bisa langsung
									mulai tanpa berantakan.
								</p>

								<div className='mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3'>
									<div className='bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]'>
										<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
											Real-time
										</p>
										<p className='text-2xl font-bold text-slate-900 mt-1'>
											Tepat waktu
										</p>
									</div>
									<div className='bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]'>
										<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
											Tenant
										</p>
										<p className='text-2xl font-bold text-slate-900 mt-1'>
											Terkunci
										</p>
									</div>
									<div className='bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]'>
										<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
											Task
										</p>
										<p className='text-2xl font-bold text-slate-900 mt-1'>
											Sinkron
										</p>
									</div>
								</div>

								<div className='mt-7 flex flex-col sm:flex-row gap-3'>
									<Button
										type='button'
										variant='primary'
										size='lg'
										onClick={onGoLogin}
									>
										Masuk untuk mulai
										<ArrowRight className='w-4 h-4' />
									</Button>
									<Button
										type='button'
										variant='secondary'
										size='lg'
										onClick={onGoRegister}
										className='bg-slate-100 hover:bg-slate-200'
									>
										Buat akun
									</Button>
								</div>

								<p className='mt-4 text-xs text-slate-500'>
									By continuing, you agree to the demo experience (no real data
									collect yet).
								</p>

								<div className='mt-5 rounded-2xl border border-slate-200/80 bg-white/60 p-4'>
									<div className='flex items-start gap-3'>
										<div className='w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center flex-shrink-0'>
											<MessageCircle className='w-5 h-5' aria-hidden='true' />
										</div>
										<div>
											<p className='text-sm font-semibold text-slate-900'>
												Butuh bantuan memilih paket?
											</p>
											<p className='text-xs text-slate-600 mt-1 leading-relaxed'>
												Mulai dari{" "}
												<span className='font-semibold text-slate-900'>
													Pro
												</span>{" "}
												untuk pengalaman paling lengkap, atau lanjut ke Task Hub
												sesuai kebutuhan.
											</p>
										</div>
									</div>
								</div>
							</div>
						</section>

						<section className='space-y-4 flex flex-col h-full'>
							<div
								className={`${cardClean} p-5 bg-white/80 backdrop-blur-md shadow-clean-md`}
							>
								<div className='flex items-center justify-between gap-4'>
									<div>
										<p className='text-sm font-semibold text-slate-900'>
											Pilih highlight iklan
										</p>
										<p className='text-xs text-slate-500 mt-0.5'>
											Interaktif, biar kamu bisa cek value cepat.
										</p>
									</div>
									<div
										className='text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full'
										aria-live='polite'
									>
										Step {features.findIndex((f) => f.key === active) + 1}/3
									</div>
								</div>

								<div className='mt-4 flex gap-2 flex-wrap'>
									{features.map((f) => {
										const Icon = f.icon;
										const isActive = active === f.key;
										return (
											<button
												key={f.key}
												type='button'
												onClick={() => setActive(f.key)}
												className={`inline-flex items-center px-3 py-2.5 min-h-11 rounded-xl text-xs font-semibold border transition-all ${
													isActive
														? "bg-indigo-600 text-white border-indigo-600 shadow-clean-md"
														: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
												} ${focusRing}`}
												aria-pressed={isActive}
											>
												<span className='inline-flex items-center gap-2'>
													<Icon className='w-4 h-4' />
													{f.key === "realtime"
														? "Real-time"
														: f.key === "tenant"
														? "Aman"
														: "Task Hub"}
												</span>
											</button>
										);
									})}
								</div>

								<div className='mt-4 flex gap-4 items-start'>
									<div className='w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center flex-shrink-0'>
										{(() => {
											const Icon = activeFeature.icon;
											return <Icon className='w-5 h-5' aria-hidden='true' />;
										})()}
									</div>
									<div>
										<p className='text-slate-900 font-semibold'>
											{activeFeature.title}
										</p>
										<p className='text-slate-600 text-sm mt-0.5 leading-relaxed'>
											{activeFeature.desc}
										</p>
									</div>
								</div>
							</div>

							<div
								className={`${cardClean} p-5 bg-white/70 backdrop-blur-md shadow-clean-md`}
							>
								<p className='text-sm font-semibold text-slate-900'>
									Biar makin jelas: alur cepat
								</p>
								<div className='mt-3 space-y-3'>
									{[
										{
											no: "01",
											title: "Pilih tujuan",
											desc: "Mulai dari chat atau dari task hub.",
										},
										{
											no: "02",
											title: "Tetap di workspace",
											desc: "Tenant isolation menjaga data tetap benar.",
										},
										{
											no: "03",
											title: "Lanjutkan dengan rapi",
											desc: "Recently opened tasks tersimpan di DB.",
										},
									].map((s) => (
										<div
											key={s.no}
											className='flex gap-3 items-start rounded-2xl border border-slate-200/70 bg-white/60 p-4'
										>
											<div className='w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold'>
												{s.no}
											</div>
											<div>
												<p className='text-sm font-semibold text-slate-900'>
													{s.title}
												</p>
												<p className='text-xs text-slate-600 mt-1 leading-relaxed'>
													{s.desc}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</section>
					</div>
					<div
						className={`${cardClean} max-w-6xl mt-5 mx-auto grid lg:grid-cols-1 gap-8 items-stretch p-5 bg-white/80 backdrop-blur-md shadow-clean-md`}
					>
						<div>
							<div className='flex items-start justify-between gap-4'>
								<div>
									<p className='text-sm font-semibold text-slate-900'>
										Pricing
									</p>
								</div>
								{pricingLoading ? (
									<span className='text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full'>
										Memuat...
									</span>
								) : (
									<span className='text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full'>
										{pricingPlans.length || 0} paket
									</span>
								)}
							</div>

							{pricingLoading ? (
								<div
									className='mt-4 grid grid-cols-1 gap-3'
									aria-busy={pricingLoading}
									aria-live='polite'
								>
									{[0, 1, 2].map((k) => (
										<div
											key={k}
											className='h-[210px] rounded-2xl border border-slate-200/80 bg-slate-200/40 animate-pulse'
										/>
									))}
								</div>
							) : (
								<div
									className='mt-4 grid grid-cols-1 gap-3'
									aria-busy={pricingLoading}
									aria-live='polite'
								>
									{pricingPlans.map((plan) => {
										const feats = Array.isArray(plan.features)
											? plan.features
											: [];
										const recommended = isRecommended(plan);
										const ctaText =
											variant === "guest"
												? `Mulai ${plan.title}`
												: "Lihat Task Hub";
										const ctaHandler =
											variant === "guest" ? onGoLogin : onGoTasks;
										return (
											<div
												key={plan.key}
												className={`relative rounded-2xl border p-4 ${
													recommended
														? "border-indigo-200 bg-indigo-50/60"
														: "border-slate-200 bg-white/70"
												}`}
											>
												{recommended && (
													<div className='absolute -top-2 right-3'>
														<span className='text-[11px] font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-full shadow-clean-md'>
															Paling populer
														</span>
													</div>
												)}

												<div className='flex items-start justify-between gap-3'>
													<p className='text-sm font-semibold text-slate-900'>
														{plan.title}
													</p>
													<span className='text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full truncate max-w-[55%] min-w-0'>
														{formatIDR(plan.price_idr)} / {plan.interval}
													</span>
												</div>

												<p className='text-xs text-slate-600 mt-2 leading-relaxed'>
													{plan.description || ""}
												</p>

												<ul className='mt-3 space-y-1'>
													{feats.slice(0, 4).map((f, idx) => (
														<li
															key={`${plan.key}-${idx}`}
															className='text-xs text-slate-700 flex gap-2 items-start'
														>
															<span
																className={`mt-0.5 inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${
																	recommended ? "bg-indigo-600" : "bg-slate-400"
																}`}
																aria-hidden='true'
															/>
															<span>{f}</span>
														</li>
													))}
												</ul>

												<div className='mt-4'>
													<Button
														type='button'
														variant={recommended ? "primary" : "secondary"}
														size='md'
														fullWidth
														onClick={ctaHandler}
													>
														{ctaText}
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
