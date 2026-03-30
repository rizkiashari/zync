import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { focusRing } from "../../lib/uiClasses";
import { onboardingPricingService } from "../../services/onboardingPricingService";

const normalizeFeatures = (text) =>
	text
		.split("\n")
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 10);

const featuresToText = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");

export default function OnboardingPricingAdminPanel() {
	const [plans, setPlans] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			try {
				const res = await onboardingPricingService.list();
				const items = res?.data?.data || [];
				if (!cancelled) setPlans(Array.isArray(items) ? items : []);
			} catch (err) {
				if (!cancelled) setPlans([]);
				toast.error(
					err?.response?.data?.error?.message || "Gagal memuat pricing",
				);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const planKeys = useMemo(() => ["free", "pro", "enterprise"], []);

	const ensurePlans = (basePlans) => {
		const map = new Map((basePlans || []).map((p) => [p.key, p]));
		return planKeys.map((key, idx) => {
			const existing = map.get(key);
			return (
				existing || {
					key,
					sort_index: idx,
					title: "",
					price_idr: 0,
					interval: "bulan",
					currency: "IDR",
					description: "",
					features: [],
				}
			);
		});
	};

	const visiblePlans = ensurePlans(plans);

	const updateField = (key, field, value) => {
		setPlans((prev) => {
			const next = ensurePlans(prev);
			const updated = next.map((p) =>
				p.key === key ? { ...p, [field]: value } : p,
			);
			return updated;
		});
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const payload = visiblePlans.map((p) => ({
				...p,
				price_idr: Number.isFinite(p.price_idr) ? p.price_idr : 0,
			}));
			await onboardingPricingService.upsert(payload);
			toast.success("Pricing berhasil disimpan");
		} catch (err) {
			toast.error(
				err?.response?.data?.error?.message || "Gagal menyimpan pricing",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<section className='w-full'>
			<div className='flex items-start justify-between gap-4 mb-4'>
				<div>
					<h2 className='text-lg font-bold text-white tracking-tight'>
						Superadmin: Pricing
					</h2>
					<p className='text-sm text-slate-300 mt-1 leading-relaxed'>
						Pricing ini ditampilkan di entry point guest dan bagian utama
						setelah login.
					</p>
				</div>
				<Button
					type='button'
					variant='primary'
					onClick={handleSave}
					loading={saving}
					disabled={loading}
					className='shadow-clean-md'
				>
					Simpan
				</Button>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{visiblePlans.map((plan) => {
					const text = featuresToText(plan.features);
					return (
						<div
							key={plan.key}
							className='bg-slate-900/15 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-md shadow-clean-md'
						>
							<div className='flex items-center justify-between gap-3'>
								<p className='text-sm font-semibold text-white'>
									{plan.title || plan.key}
								</p>
								<span className='text-[11px] font-semibold text-indigo-100 bg-indigo-500/15 border border-indigo-200/20 px-2 py-1 rounded-full'>
									{plan.key}
								</span>
							</div>

							<div className='mt-3 space-y-3'>
								<Input
									label='Nama paket'
									type='text'
									placeholder='Contoh: Pro'
									value={plan.title}
									onChange={(e) =>
										updateField(plan.key, "title", e.target.value)
									}
									required={false}
									className='text-sm'
								/>
								<Input
									label='Harga (IDR)'
									type='number'
									placeholder='0'
									value={String(plan.price_idr ?? 0)}
									onChange={(e) =>
										(() => {
											const next = parseInt(e.target.value || "0", 10);
											updateField(
												plan.key,
												"price_idr",
												Number.isNaN(next) ? 0 : next,
											);
										})()
									}
									className='text-sm'
								/>

								<div className='flex gap-3'>
									<div className='flex-1'>
										<label className='block text-sm font-medium text-slate-200 mb-1.5'>
											Interval
										</label>
										<select
											value={plan.interval}
											onChange={(e) =>
												updateField(plan.key, "interval", e.target.value)
											}
											className='w-full min-h-11 px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-800/50 text-slate-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent'
										>
											<option value='bulan'>per bulan</option>
											<option value='tahun'>per tahun</option>
										</select>
									</div>
								</div>

								<Input
									label='Deskripsi singkat'
									type='text'
									placeholder='Tulis benefit utama paket'
									value={plan.description}
									onChange={(e) =>
										updateField(plan.key, "description", e.target.value)
									}
								/>

								<div className='flex flex-col gap-1.5'>
									<label className='text-sm font-medium text-slate-200'>
										Features (1 baris = 1 item)
									</label>
									<textarea
										value={text}
										onChange={(e) => {
											const feats = normalizeFeatures(e.target.value);
											updateField(plan.key, "features", feats);
										}}
										rows={5}
										className={`w-full min-h-[140px] px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-800/50 text-slate-100 text-sm resize-y focus:outline-none ${focusRing} focus-visible:ring-indigo-500`}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
