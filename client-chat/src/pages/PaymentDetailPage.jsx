import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Building2,
	CreditCard,
	Wallet,
	Copy,
	CheckCircle2,
	Smartphone,
	QrCode,
	Landmark,
} from "lucide-react";
import MainShell from "../components/layout/MainShell";
import Button from "../components/ui/Button";
import { cardClean, focusRing } from "../lib/uiClasses";
import { onboardingPricingService } from "../services/onboardingPricingService";
import { midtransPaymentService } from "../services/midtransPaymentService";
import { payWithSnap } from "../lib/midtrans";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const midtransClientKey = (
	import.meta.env.VITE_MIDTRANS_CLIENT_KEY || ""
).trim();
const midtransIsProduction =
	import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true";

const ALLOWED_PLANS = ["pro", "enterprise"];

/** Fallback jika paket belum ada di API onboarding-pricing */
const PLAN_FALLBACK = {
	pro: {
		title: "Pro",
		description: "Anggota & fitur lengkap untuk tim yang berkembang.",
		price_idr: null,
		interval: "bulan",
		features: [
			"Anggota tak terbatas",
			"10 GB storage",
			"Semua fitur",
			"Prioritas support",
		],
	},
	enterprise: {
		title: "Enterprise",
		description: "Paket kustom untuk organisasi besar.",
		price_idr: null,
		interval: "tahun",
		features: [
			"Custom anggota",
			"Storage custom",
			"Fitur custom",
			"Dedicated support",
		],
	},
};

/** Metode bayar UI — instruksi demo; produksi: ganti dengan respons gateway (Midtrans, Xendit, dll.). */
const PAYMENT_METHODS = [
	{
		id: "gopay",
		label: "GoPay",
		short: "E-wallet Gojek",
		icon: Smartphone,
		accent: "bg-[#00aed6]/15 text-[#00a3bf] border-[#00aed6]/30",
	},
	{
		id: "qris",
		label: "QRIS",
		short: "Scan satu kode",
		icon: QrCode,
		accent: "bg-slate-900/5 text-slate-800 border-slate-300",
	},
	{
		id: "bca",
		label: "BCA",
		short: "Virtual Account",
		icon: Landmark,
		accent: "bg-[#0066ae]/10 text-[#00529c] border-[#0066ae]/25",
	},
	{
		id: "bni",
		label: "BNI",
		short: "Virtual Account",
		icon: Landmark,
		accent: "bg-[#ff6b00]/10 text-[#e85d00] border-[#ff6b00]/30",
	},
];

export default function PaymentDetailPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { user } = useAuth();
	const workspace = useSelector((s) => s.workspace.current);

	const planKey = (searchParams.get("plan") || "").toLowerCase();
	const initialMethod = (searchParams.get("method") || "gopay").toLowerCase();
	const validInitial = PAYMENT_METHODS.some((m) => m.id === initialMethod) ?
			initialMethod
		:	"gopay";

	const [pricingPlans, setPricingPlans] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedMethod, setSelectedMethod] = useState(validInitial);
	const [snapLoading, setSnapLoading] = useState(false);

	useEffect(() => {
		if (!ALLOWED_PLANS.includes(planKey)) return;
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			try {
				const res = await onboardingPricingService.list();
				const items = res?.data?.data || [];
				if (!cancelled) setPricingPlans(Array.isArray(items) ? items : []);
			} catch {
				if (!cancelled) setPricingPlans([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [planKey]);

	const apiPlan = useMemo(
		() => pricingPlans.find((p) => p.key === planKey) || null,
		[pricingPlans, planKey],
	);

	const resolved = useMemo(() => {
		const fb = PLAN_FALLBACK[planKey];
		if (!fb) return null;
		if (!apiPlan) {
			return {
				title: fb.title,
				description: fb.description,
				price_idr: fb.price_idr,
				interval: fb.interval,
				features: fb.features,
				source: "fallback",
			};
		}
		const feats = Array.isArray(apiPlan.features)
			? apiPlan.features
			: fb.features;
		return {
			title: apiPlan.title || fb.title,
			description: apiPlan.description || fb.description,
			price_idr:
				typeof apiPlan.price_idr === "number"
					? apiPlan.price_idr
					: fb.price_idr,
			interval: apiPlan.interval || fb.interval,
			features: feats.length ? feats : fb.features,
			source: "api",
		};
	}, [apiPlan, planKey]);

	const referenceId = useMemo(() => {
		const wid = workspace?.id ?? "ws";
		const short = String(wid).slice(-6).toUpperCase();
		return `ZYNC-${planKey.toUpperCase()}-${short}-${Date.now()
			.toString(36)
			.toUpperCase()}`;
	}, [workspace?.id, planKey]);

	const vaDemo = useMemo(() => {
		const tail = referenceId.replace(/\D/g, "").slice(-8) || "12345678";
		return {
			bca: `80777${tail}`,
			bni: `98888${tail}`,
		};
	}, [referenceId]);

	const formatIDR = (n) => {
		if (typeof n !== "number") return null;
		return new Intl.NumberFormat("id-ID").format(n);
	};

	const workspaceName =
		workspace?.custom_name || workspace?.name || "Workspace";

	if (!ALLOWED_PLANS.includes(planKey)) {
		return (
			<MainShell>
				<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4'>
					<p className='text-sm text-slate-600 text-center'>
						Paket tidak valid. Pilih paket berbayar dari pengaturan langganan.
					</p>
					<Button
						type='button'
						onClick={() => navigate("/workspace/settings?tab=subscription")}
					>
						Ke pengaturan workspace
					</Button>
				</div>
			</MainShell>
		);
	}

	const copyText = (text, msg = "Disalin") => {
		void navigator.clipboard.writeText(text);
		toast.success(msg);
	};

	const priceText =
		resolved?.price_idr != null ? formatIDR(resolved.price_idr) : null;

	const handleMidtransPay = async () => {
		if (!midtransClientKey) {
			toast.error(
				"Tambahkan VITE_MIDTRANS_CLIENT_KEY di environment frontend (Sandbox/Production).",
			);
			return;
		}
		if (resolved?.price_idr == null || resolved.price_idr <= 0) {
			toast.error(
				"Paket belum memiliki harga (price_idr). Atur di admin onboarding pricing.",
			);
			return;
		}
		setSnapLoading(true);
		try {
			const res = await midtransPaymentService.createSnapToken({
				planKey,
				paymentMethod: selectedMethod,
			});
			const token = res?.data?.data?.token;
			if (!token) {
				toast.error("Token pembayaran tidak diterima dari server.");
				return;
			}
			await payWithSnap(
				midtransClientKey,
				midtransIsProduction,
				token,
				{
					onSuccess: () => {
						toast.success("Pembayaran berhasil.");
						navigate("/workspace/settings?tab=subscription");
					},
					onPending: () => {
						toast("Menunggu konfirmasi pembayaran.", { icon: "⏳" });
						navigate("/workspace/settings?tab=subscription");
					},
					onError: () => {
						toast.error("Pembayaran gagal atau dibatalkan.");
					},
					onClose: () => {},
				},
			);
		} catch (e) {
			const msg =
				e?.response?.data?.error?.message ||
				e?.message ||
				"Gagal memulai pembayaran.";
			toast.error(msg);
		} finally {
			setSnapLoading(false);
		}
	};

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-light pb-[env(safe-area-inset-bottom)]'>
				<div className='sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6'>
					<button
						type='button'
						onClick={() => navigate(-1)}
						aria-label='Kembali'
						className={`min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div className='min-w-0 flex-1'>
						<h1 className='text-lg font-bold text-slate-900 truncate'>
							Detail pembayaran
						</h1>
						<p className='text-xs text-slate-500 truncate'>{resolved?.title}</p>
					</div>
				</div>

				<div className='mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-6 sm:px-6'>
					{loading ? (
						<div
							className='h-40 rounded-2xl bg-slate-100 animate-pulse'
							aria-busy='true'
						/>
					) : (
						<>
							<section className={`${cardClean} p-5 space-y-4`}>
								<div className='flex items-start gap-3'>
									<div className='w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0'>
										<Building2 className='w-5 h-5 text-indigo-600' />
									</div>
									<div className='min-w-0'>
										<p className='text-xs font-medium text-slate-500'>
											Workspace
										</p>
										<p className='text-sm font-semibold text-slate-800 truncate'>
											{workspaceName}
										</p>
										{user?.email && (
											<p className='text-xs text-slate-400 truncate mt-0.5'>
												{user.email}
											</p>
										)}
									</div>
								</div>

								<div className='border-t border-slate-100 pt-4'>
									<div className='flex items-center gap-2 mb-2'>
										<CreditCard className='w-4 h-4 text-slate-400' />
										<p className='text-xs font-medium text-slate-500'>Paket</p>
									</div>
									<p className='text-base font-bold text-slate-900'>
										{resolved?.title}
									</p>
									{resolved?.description && (
										<p className='text-sm text-slate-600 mt-1 leading-relaxed'>
											{resolved.description}
										</p>
									)}
									<div className='mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
										{priceText ? (
											<>
												<span className='text-xl font-bold text-indigo-600'>
													Rp {priceText}
												</span>
												<span className='text-sm text-slate-500'>
													/ {resolved?.interval}
												</span>
											</>
										) : (
											<p className='text-sm font-medium text-slate-700'>
												Nominal mengikuti penawaran admin — konfirmasi via
												referensi di bawah.
											</p>
										)}
									</div>
								</div>

								{resolved?.features && resolved.features.length > 0 && (
									<ul className='space-y-1.5 pt-2 border-t border-slate-100'>
										{resolved.features.map((f) => (
											<li
												key={f}
												className='flex items-start gap-2 text-xs text-slate-600'
											>
												<CheckCircle2 className='w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5' />
												{f}
											</li>
										))}
									</ul>
								)}
							</section>

							<section className={`${cardClean} p-5 space-y-4`}>
								<div className='flex items-center gap-2'>
									<Wallet className='w-5 h-5 text-emerald-600' />
									<h2 className='text-sm font-semibold text-slate-800'>
										Pilih metode pembayaran
									</h2>
								</div>
								<p className='text-xs text-slate-500 leading-relaxed'>
									Pilih metode lalu bayar lewat{" "}
									<strong className='text-slate-700'>Midtrans Snap</strong> (live
									jika server dan client key sudah diset). Instruksi manual di bawah
									hanya cadangan / demo.
								</p>

								<div
									className='grid grid-cols-2 gap-2 sm:grid-cols-4'
									role='radiogroup'
									aria-label='Metode pembayaran'
								>
									{PAYMENT_METHODS.map((m) => {
										const Icon = m.icon;
										const on = selectedMethod === m.id;
										return (
											<button
												key={m.id}
												type='button'
												role='radio'
												aria-checked={on}
												onClick={() => setSelectedMethod(m.id)}
												className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all ${focusRing} ${
													on ?
														`${m.accent} border-current shadow-sm`
													:	"border-slate-200 bg-white text-slate-600 hover:border-slate-300"
												}`}
											>
												<Icon className='w-5 h-5 shrink-0' aria-hidden />
												<span className='text-xs font-bold leading-tight'>
													{m.label}
												</span>
												<span className='text-[10px] text-slate-500 leading-snug sm:text-[11px]'>
													{m.short}
												</span>
											</button>
										);
									})}
								</div>

								<div className='rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2'>
									<p className='text-xs font-medium text-slate-500'>
										Kode referensi (semua metode)
									</p>
									<div className='flex items-center gap-2 min-w-0'>
										<code className='flex-1 min-w-0 text-xs font-mono text-slate-800 break-all'>
											{referenceId}
										</code>
										<button
											type='button'
											onClick={() =>
												copyText(referenceId, "Kode referensi disalin")
											}
											className={`shrink-0 p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 ${focusRing}`}
											aria-label='Salin kode referensi'
										>
											<Copy className='w-4 h-4 text-slate-600' />
										</button>
									</div>
								</div>

								{selectedMethod === "gopay" && (
									<div className='rounded-xl border border-dashed border-[#00aed6]/40 bg-[#00aed6]/5 p-4 text-xs text-slate-700 space-y-3'>
										<p className='font-semibold text-slate-800'>GoPay</p>
										<ol className='list-decimal list-inside space-y-1.5 text-slate-600'>
											<li>Buka aplikasi Gojek → tab GoPay.</li>
											<li>
												Pilih Bayar / Scan QR (nominal{" "}
												{priceText ? `Rp ${priceText}` : "sesuai tagihan"}).
											</li>
											<li>
												Pada catatan / pesan, tulis:{" "}
												<code className='font-mono text-[11px] bg-white px-1 rounded'>
													{referenceId}
												</code>
											</li>
										</ol>
										<p className='text-slate-500'>
											Integrasi: Snap GoPay / link deeplink dari Midtrans,Xendit,
											dll. akan mengganti langkah manual ini.
										</p>
									</div>
								)}

								{selectedMethod === "qris" && (
									<div className='rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-700 space-y-3'>
										<p className='font-semibold text-slate-800'>QRIS</p>
										<div className='flex flex-col sm:flex-row gap-4 items-center'>
											<div className='flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50'>
												<div className='text-center px-2'>
													<QrCode className='w-10 h-10 text-slate-400 mx-auto mb-2' />
													<p className='text-[10px] text-slate-500 leading-tight'>
														QR dinamis dari gateway akan tampil di sini
													</p>
												</div>
											</div>
											<ol className='list-decimal list-inside space-y-1.5 text-slate-600 flex-1'>
												<li>Buka aplikasi bank atau e-wallet yang mendukung QRIS.</li>
												<li>Scan kode QR (contoh area di kiri).</li>
												<li>
													Pastikan nominal cocok; keterangan berisi referensi{" "}
													<code className='font-mono text-[11px]'>
														{referenceId}
													</code>
													.
												</li>
											</ol>
										</div>
									</div>
								)}

								{selectedMethod === "bca" && (
									<div className='rounded-xl border border-dashed border-[#0066ae]/35 bg-[#0066ae]/5 p-4 text-xs text-slate-700 space-y-3'>
										<p className='font-semibold text-slate-800'>
											BCA Virtual Account
										</p>
										<div className='rounded-lg bg-white border border-slate-200 p-3 space-y-2'>
											<p className='text-[11px] text-slate-500'>
												Transfer ke nomor VA berikut (demo):
											</p>
											<div className='flex items-center gap-2 flex-wrap'>
												<code className='text-sm font-mono font-bold text-slate-900'>
													{vaDemo.bca}
												</code>
												<button
													type='button'
													onClick={() =>
														copyText(vaDemo.bca, "Nomor VA BCA disalin")
													}
													className={`text-[11px] font-semibold text-[#0066ae] px-2 py-1 rounded-lg hover:bg-[#0066ae]/10 ${focusRing}`}
												>
													Salin
												</button>
											</div>
											<p className='text-slate-600'>
												Atas nama: <strong>ZYNC BILLING DEMO</strong>
											</p>
										</div>
										<ol className='list-decimal list-inside space-y-1 text-slate-600'>
											<li>m-BCA / KlikBCA / ATM: menu Bayar → BCA Virtual Account.</li>
											<li>Masukkan nomor VA di atas.</li>
											<li>
												Nominal{" "}
												{priceText ?
													<strong>Rp {priceText}</strong>
												:	"sesuai tagihan"}{" "}
												— field berita tidak wajib jika VA sudah unik per order.
											</li>
										</ol>
									</div>
								)}

								{selectedMethod === "bni" && (
									<div className='rounded-xl border border-dashed border-[#ff6b00]/35 bg-[#ff6b00]/5 p-4 text-xs text-slate-700 space-y-3'>
										<p className='font-semibold text-slate-800'>
											BNI Virtual Account
										</p>
										<div className='rounded-lg bg-white border border-slate-200 p-3 space-y-2'>
											<p className='text-[11px] text-slate-500'>
												Transfer ke nomor VA berikut (demo):
											</p>
											<div className='flex items-center gap-2 flex-wrap'>
												<code className='text-sm font-mono font-bold text-slate-900'>
													{vaDemo.bni}
												</code>
												<button
													type='button'
													onClick={() =>
														copyText(vaDemo.bni, "Nomor VA BNI disalin")
													}
													className={`text-[11px] font-semibold text-[#ff6b00] px-2 py-1 rounded-lg hover:bg-[#ff6b00]/10 ${focusRing}`}
												>
													Salin
												</button>
											</div>
											<p className='text-slate-600'>
												Atas nama: <strong>ZYNC BILLING DEMO</strong>
											</p>
										</div>
										<ol className='list-decimal list-inside space-y-1 text-slate-600'>
											<li>
												BNI Mobile / iBanking / ATM: Virtual Account Billing.
											</li>
											<li>Masukkan {vaDemo.bni}.</li>
											<li>
												Bayar{" "}
												{priceText ?
													<strong>Rp {priceText}</strong>
												:	"sesuai tagihan"}
												.
											</li>
										</ol>
									</div>
								)}
							</section>

							<div className='flex flex-col gap-3'>
								<Button
									type='button'
									variant='primary'
									fullWidth
									disabled={
										snapLoading ||
										resolved?.price_idr == null ||
										resolved.price_idr <= 0
									}
									onClick={() => void handleMidtransPay()}
								>
									{snapLoading ? "Membuka pembayaran…" : "Bayar dengan Midtrans"}
								</Button>
								<div className='flex flex-col sm:flex-row gap-3'>
									<Button
										type='button'
										variant='secondary'
										fullWidth
										className='sm:flex-1'
										onClick={() =>
											navigate("/workspace/settings?tab=subscription")
										}
									>
										Kembali ke langganan
									</Button>
									<Button
										type='button'
										variant='secondary'
										fullWidth
										className='sm:flex-1'
										onClick={() => {
											toast.success(
												"Terima kasih — konfirmasi manual akan diproses sesuai alur tim Anda.",
											);
											navigate("/workspace/settings?tab=subscription");
										}}
									>
										Saya sudah membayar (manual)
									</Button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</MainShell>
	);
}
