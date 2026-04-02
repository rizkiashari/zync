import { ArrowRight, Blocks, Sparkles } from "lucide-react";
import Logo from "../ui/Logo";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { focusRing } from "../../lib/uiClasses";

const shell =
	"font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] [-webkit-tap-highlight-color:transparent]";

function firstName(name) {
	if (!name) return "dunia";
	return name.split(" ")[0] || name;
}

/** Marketing / guest onboarding — full-bleed, bottom CTAs, no “browser card” layout */
export function AdOnboardingGuestNative({
	active,
	setActive,
	activeFeature,
	features,
	pricingPlans,
	pricingLoading,
	formatIDR,
	isRecommended,
	onGoLogin,
	onGoRegister,
}) {
	return (
		<div
			className={`${shell} flex min-h-dvh w-full max-w-[100vw] flex-col bg-[#070708] text-zinc-100 overflow-x-hidden`}
		>
			<div className='shrink-0 pt-[max(12px,env(safe-area-inset-top))] px-4 pb-2'>
				<div className='flex items-center justify-between gap-3'>
					<div className='flex items-center gap-3 min-w-0'>
						<div className='w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40'>
							<Logo size={26} variant='white' />
						</div>
						<div className='min-w-0'>
							<p className='text-lg font-semibold text-white tracking-tight truncate'>
								Zync
							</p>
							<p className='text-[13px] text-zinc-500 truncate'>
								Chat & workspace ringan
							</p>
						</div>
					</div>
					<button
						type='button'
						onClick={onGoLogin}
						className={`shrink-0 text-[15px] font-medium text-indigo-400 active:text-indigo-300 ${focusRing} rounded-lg px-2 py-1`}
					>
						Masuk
					</button>
				</div>
			</div>

			<div className='flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pb-44'>
				<h1 className='mt-1 text-[28px] leading-[1.15] font-bold text-white tracking-tight'>
					Undang tim. Obrol cepat. Tetap rapi.
				</h1>
				<p className='mt-3 text-[16px] leading-relaxed text-zinc-400'>
					Pesan real-time dan workspace terpisah — tanpa nuansa dashboard web
					yang ramai.
				</p>

				<div
					className='mt-6 grid grid-cols-3 gap-2'
					role='tablist'
					aria-label='Sorotan fitur'
				>
					{features.map((f) => {
						const Icon = f.icon;
						const isOn = active === f.key;
						const label =
							f.key === "realtime"
								? "Live"
								: f.key === "tenant"
								? "Aman"
								: "Task";
						return (
							<button
								key={f.key}
								type='button'
								role='tab'
								aria-selected={isOn}
								onClick={() => setActive(f.key)}
								className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 transition-colors ${
									isOn
										? "bg-indigo-600 text-white"
										: "bg-zinc-900 text-zinc-400 active:bg-zinc-800"
								} ${focusRing}`}
							>
								<Icon className='w-5 h-5 opacity-90' aria-hidden />
								<span className='text-[12px] font-semibold'>{label}</span>
							</button>
						);
					})}
				</div>

				<div className='mt-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5'>
					<div className='flex gap-3'>
						<div className='w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/25'>
							{(() => {
								const Icon = activeFeature.icon;
								return <Icon className='w-5 h-5' aria-hidden />;
							})()}
						</div>
						<div className='min-w-0'>
							<p className='text-[17px] font-semibold text-white leading-snug'>
								{activeFeature.title}
							</p>
							<p className='text-[15px] text-zinc-400 mt-1 leading-relaxed'>
								{activeFeature.desc}
							</p>
						</div>
					</div>
				</div>

				<div className='mt-6'>
					<p className='text-[13px] font-medium text-zinc-500 uppercase tracking-wide'>
						Mulai cepat
					</p>
					<ul className='mt-3 space-y-3 text-[15px] text-zinc-400'>
						<li className='flex gap-3'>
							<span className='text-indigo-400 font-semibold tabular-nums w-6 shrink-0'>
								1
							</span>
							<span>Pilih fokus: chat atau task hub.</span>
						</li>
						<li className='flex gap-3'>
							<span className='text-indigo-400 font-semibold tabular-nums w-6 shrink-0'>
								2
							</span>
							<span>Data tetap di workspace kamu.</span>
						</li>
						<li className='flex gap-3'>
							<span className='text-indigo-400 font-semibold tabular-nums w-6 shrink-0'>
								3
							</span>
							<span>Lanjut kerja tanpa kehilangan konteks.</span>
						</li>
					</ul>
				</div>

				<div className='mt-8'>
					<div className='flex items-baseline justify-between gap-2 mb-3'>
						<p className='text-[20px] font-bold text-white'>Paket</p>
						{pricingLoading ? (
							<span className='text-[13px] text-zinc-500'>Memuat…</span>
						) : (
							<span className='text-[13px] text-zinc-500'>
								{pricingPlans.length} pilihan
							</span>
						)}
					</div>

					{pricingLoading ? (
						<div className='space-y-3' aria-busy='true' aria-live='polite'>
							{[0, 1, 2].map((k) => (
								<div
									key={k}
									className='h-[140px] rounded-2xl bg-zinc-900 animate-pulse'
								/>
							))}
						</div>
					) : (
						<div className='space-y-3' aria-live='polite'>
							{pricingPlans.map((plan) => {
								const feats = Array.isArray(plan.features) ? plan.features : [];
								const recommended = isRecommended(plan);
								return (
									<div
										key={plan.key}
										className={`rounded-2xl border px-4 py-4 ${
											recommended
												? "border-indigo-500/40 bg-indigo-950/40"
												: "border-zinc-800 bg-zinc-900/60"
										}`}
									>
										{recommended && (
											<p className='text-[11px] font-semibold text-indigo-300 mb-2'>
												Paling pas untuk tim
											</p>
										)}
										<div className='flex items-start justify-between gap-2'>
											<p className='text-[17px] font-semibold text-white'>
												{plan.title}
											</p>
											<p className='text-[14px] text-zinc-400 text-right shrink-0'>
												Rp {formatIDR(plan.price_idr)}
												<span className='text-zinc-500'>
													{" "}
													/ {plan.interval}
												</span>
											</p>
										</div>
										{plan.description ? (
											<p className='text-[14px] text-zinc-500 mt-1 leading-snug'>
												{plan.description}
											</p>
										) : null}
										<ul className='mt-3 space-y-1.5'>
											{feats.slice(0, 4).map((f, idx) => (
												<li
													key={`${plan.key}-${idx}`}
													className='text-[14px] text-zinc-400 flex gap-2'
												>
													<span className='text-indigo-400 shrink-0'>✓</span>
													<span>{f}</span>
												</li>
											))}
										</ul>
										<Button
											type='button'
											variant={recommended ? "primary" : "secondary"}
											size='md'
											fullWidth
											className={`mt-4 ${
												recommended
													? ""
													: "bg-zinc-800 border-zinc-700 text-zinc-100"
											}`}
											onClick={onGoLogin}
										>
											Mulai dengan {plan.title}
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<p className='mt-6 text-[12px] text-zinc-600 leading-relaxed'>
					Dengan melanjutkan, kamu setuju dengan pengalaman demo ini.
				</p>
			</div>

			<div className='shrink-0 border-t border-zinc-800 bg-[#070708]/95 backdrop-blur-xl px-4 pt-3 space-y-2 z-10'>
				<Button
					type='button'
					variant='primary'
					size='lg'
					fullWidth
					onClick={onGoRegister}
					className='h-12 text-[17px] font-semibold rounded-2xl shadow-lg shadow-indigo-900/30'
				>
					Buat akun
					<ArrowRight className='w-5 h-5' />
				</Button>
				<button
					type='button'
					onClick={onGoLogin}
					className={`w-full h-11 rounded-2xl text-[16px] font-medium text-zinc-400 active:bg-zinc-900 ${focusRing}`}
				>
					Sudah punya akun? Masuk
				</button>
				<div className='h-[max(8px,calc(env(safe-area-inset-bottom)-12px))]' />
			</div>
		</div>
	);
}

/** Dashboard hero — stacked actions, full-width touch targets */
export function AdOnboardingDashboardNative({
	user,
	onCreateGroup,
	onGoTasks,
	onGoPricing,
	onSkipToContent,
}) {
	return (
		<section
			className={`${shell} relative bg-zinc-900 border-b border-zinc-800 overflow-hidden`}
		>
			<div className='absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-zinc-900 to-zinc-900 pointer-events-none' />
			<div className='relative px-4 pt-[max(14px,env(safe-area-inset-top))] pb-5'>
				<div className='flex items-center gap-3 mb-5'>
					<div className='ring-2 ring-white/15 rounded-full'>
						<Avatar
							name={user?.username || user?.name || "Zync"}
							size='lg'
							online={true}
						/>
					</div>
					<div className='min-w-0'>
						<p className='text-[13px] text-zinc-400'>Selamat datang kembali</p>
						<p className='text-[22px] font-bold text-white leading-tight truncate'>
							{firstName(user?.username || user?.name)}!
						</p>
					</div>
				</div>

				<div className='flex flex-col gap-2'>
					<Button
						type='button'
						variant='primary'
						size='lg'
						fullWidth
						onClick={onGoTasks}
						className='h-12 rounded-2xl justify-center bg-white text-zinc-900 hover:bg-zinc-100 border-0 text-[16px] font-semibold'
					>
						<Blocks className='w-5 h-5' />
						Task Hub
					</Button>
					<Button
						type='button'
						variant='primary'
						size='lg'
						fullWidth
						onClick={onCreateGroup}
						className='h-12 rounded-2xl justify-center bg-indigo-600 hover:bg-indigo-500 border-0 text-[16px] font-semibold'
					>
						<Sparkles className='w-5 h-5' />
						Grup baru
					</Button>
					<div className='grid grid-cols-2 gap-2 mt-1'>
						<button
							type='button'
							onClick={onGoPricing}
							disabled={!onGoPricing}
							className={`h-11 rounded-2xl text-[15px] font-semibold bg-zinc-800 text-zinc-100 border border-zinc-700 active:bg-zinc-700 disabled:opacity-45 ${focusRing}`}
						>
							Harga
						</button>
						<button
							type='button'
							onClick={onSkipToContent}
							className={`h-11 rounded-2xl text-[15px] font-semibold bg-transparent text-zinc-300 border border-zinc-600 active:bg-zinc-800/50 ${focusRing}`}
						>
							Dashboard
							<ArrowRight className='inline w-4 h-4 ml-1 opacity-70' />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
