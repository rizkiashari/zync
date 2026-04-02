import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Wallet } from "lucide-react";
import MainShell from "../components/layout/MainShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { adminService } from "../services/adminService";
import toast from "react-hot-toast";
import { API_BASE } from "../lib/api";
import { cardClean, focusRing } from "../lib/uiClasses";

const STATUS_LABEL = {
	pending: "Menunggu",
	approved: "Disetujui",
	rejected: "Ditolak",
	expired: "Kedaluwarsa",
	canceled: "Dibatalkan",
};

const CHANNEL_LABEL = {
	midtrans: "Midtrans",
	manual: "Manual / transfer",
};

function formatIDR(n) {
	if (n == null) return "—";
	return `Rp ${new Intl.NumberFormat("id-ID").format(Number(n))}`;
}

export default function AdminTransactionsPage() {
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState("pending");
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState(null);
	const [rejectFor, setRejectFor] = useState(null);
	const [rejectNote, setRejectNote] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminService.listPaymentTransactions({
				status: statusFilter === "all" ? undefined : statusFilter,
				limit: 100,
			});
			const list = res?.data?.data?.transactions;
			setRows(Array.isArray(list) ? list : []);
		} catch (e) {
			const msg = e?.response?.data?.error?.message;
			toast.error(msg || "Gagal memuat transaksi");
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [statusFilter]);

	useEffect(() => {
		load();
	}, [load]);

	const approve = async (id) => {
		setBusyId(id);
		try {
			await adminService.approvePaymentTransaction(id);
			toast.success("Transaksi disetujui — paket workspace diperbarui.");
			await load();
		} catch (e) {
			const msg = e?.response?.data?.error?.message;
			toast.error(msg || "Gagal menyetujui");
		} finally {
			setBusyId(null);
		}
	};

	const submitReject = async () => {
		if (!rejectFor) return;
		setBusyId(rejectFor.id);
		try {
			await adminService.rejectPaymentTransaction(rejectFor.id, rejectNote);
			toast.success("Transaksi ditolak.");
			setRejectFor(null);
			setRejectNote("");
			await load();
		} catch (e) {
			const msg = e?.response?.data?.error?.message;
			toast.error(msg || "Gagal menolak");
		} finally {
			setBusyId(null);
		}
	};

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
				<div className='sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-clean backdrop-blur-md sm:px-6 sm:py-3.5'>
					<button
						type='button'
						onClick={() => navigate("/dashboard")}
						aria-label='Kembali ke beranda'
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div className='flex items-center gap-2 min-w-0'>
						<Wallet className='w-5 h-5 text-indigo-600 shrink-0' />
						<h1 className='text-sm font-semibold text-slate-900 tracking-tight truncate'>
							Maintenance — transaksi & langganan
						</h1>
					</div>
				</div>

				<div className='flex-1 overflow-y-auto p-4 sm:p-6'>
					<div className='mx-auto max-w-6xl space-y-4'>
						<p className='text-sm text-slate-500'>
							Pembayaran <strong>Midtrans</strong> yang sukses akan{" "}
							<strong>otomatis disetujui</strong> lewat webhook. Entri{" "}
							<strong>manual</strong> perlu disetujui atau ditolak di sini.
						</p>

						<div className='flex flex-wrap gap-2 items-center'>
							{["pending", "all", "approved", "rejected"].map((s) => (
								<button
									key={s}
									type='button'
									onClick={() => setStatusFilter(s)}
									className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${focusRing} ${
										statusFilter === s
											? "border-indigo-600 bg-indigo-50 text-indigo-800"
											: "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
									}`}
								>
									{s === "all" ? "Semua" : STATUS_LABEL[s] || s}
								</button>
							))}
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => load()}
								disabled={loading}
							>
								Muat ulang
							</Button>
						</div>

						<section className={`${cardClean} overflow-x-auto`}>
							{loading ? (
								<div className='flex justify-center py-12'>
									<div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin' />
								</div>
							) : rows.length === 0 ? (
								<p className='text-sm text-slate-400 text-center py-10'>
									Tidak ada transaksi.
								</p>
							) : (
								<table className='w-full text-sm text-left min-w-[960px]'>
									<thead>
										<tr className='border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide'>
											<th className='px-4 py-3 font-medium'>Workspace</th>
											<th className='px-4 py-3 font-medium'>Pengaju</th>
											<th className='px-4 py-3 font-medium'>Order</th>
											<th className='px-4 py-3 font-medium'>Paket</th>
											<th className='px-4 py-3 font-medium'>Nominal</th>
											<th className='px-4 py-3 font-medium'>Saluran</th>
											<th className='px-4 py-3 font-medium'>Bank / rekening</th>
											<th className='px-4 py-3 font-medium'>Bukti</th>
											<th className='px-4 py-3 font-medium'>Status</th>
											<th className='px-4 py-3 font-medium text-right'>Aksi</th>
										</tr>
									</thead>
									<tbody>
										{rows.map((r) => (
											<tr
												key={r.id}
												className='border-b border-slate-100 hover:bg-slate-50/80'
											>
												<td className='px-4 py-3 font-mono text-xs text-slate-700'>
													{r.workspace_slug || "—"}
												</td>
												<td className='px-4 py-3 text-slate-600 truncate max-w-[160px]'>
													{r.requester_email || "—"}
												</td>
												<td className='px-4 py-3 font-mono text-xs text-slate-500 max-w-[140px] truncate'>
													{r.order_id}
												</td>
												<td className='px-4 py-3 capitalize'>{r.plan_key}</td>
												<td className='px-4 py-3'>{formatIDR(r.amount_idr)}</td>
												<td className='px-4 py-3'>
													{CHANNEL_LABEL[r.channel] || r.channel}
												</td>
												<td className='px-4 py-3 text-slate-600 max-w-[140px]'>
													{r.manual_payer_bank_name ||
													r.manual_payer_account_digits ? (
														<>
															<div className='font-medium text-slate-800 truncate'>
																{r.manual_payer_bank_name || "—"}
															</div>
															<div className='font-mono text-xs text-slate-500 truncate'>
																{r.manual_payer_account_digits || ""}
															</div>
														</>
													) : (
														<span className='text-slate-400'>—</span>
													)}
												</td>
												<td className='px-4 py-3'>
													{r.manual_proof_image_url ? (
														<a
															href={`${API_BASE}${r.manual_proof_image_url}`}
															target='_blank'
															rel='noopener noreferrer'
															className='text-indigo-600 hover:underline text-xs font-medium'
														>
															Buka gambar
														</a>
													) : (
														<span className='text-slate-400'>—</span>
													)}
												</td>
												<td className='px-4 py-3'>
													<span
														className={`text-xs font-medium px-2 py-0.5 rounded-full ${
															r.status === "pending"
																? "bg-amber-100 text-amber-800"
																: r.status === "approved"
																? "bg-emerald-100 text-emerald-800"
																: "bg-slate-100 text-slate-600"
														}`}
													>
														{STATUS_LABEL[r.status] || r.status}
													</span>
												</td>
												<td className='px-4 py-3 text-right'>
													{r.status === "pending" && (
														<div className='flex flex-wrap justify-end gap-1'>
															<Button
																type='button'
																size='sm'
																loading={busyId === r.id}
																disabled={busyId != null}
																onClick={() => approve(r.id)}
															>
																Setujui
															</Button>
															<Button
																type='button'
																variant='outline'
																size='sm'
																disabled={busyId != null}
																onClick={() =>
																	setRejectFor({
																		id: r.id,
																	})
																}
															>
																Tolak
															</Button>
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</section>

						<p className='text-xs text-slate-400 flex items-center gap-1'>
							<Shield className='w-3.5 h-3.5' />
							Hanya system admin. Webhook Midtrans harus dapat dijangkau dari
							internet.
						</p>
					</div>
				</div>
			</div>

			{rejectFor && (
				<div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50'>
					<div
						className={`${cardClean} w-full max-w-md p-5 space-y-4`}
						role='dialog'
						aria-labelledby='reject-title'
					>
						<h2
							id='reject-title'
							className='text-base font-semibold text-slate-900'
						>
							Tolak transaksi
						</h2>
						<Input
							label='Catatan (opsional)'
							value={rejectNote}
							onChange={(e) => setRejectNote(e.target.value)}
							placeholder='Alasan penolakan…'
						/>
						<div className='flex gap-2 justify-end'>
							<Button
								type='button'
								variant='secondary'
								onClick={() => {
									setRejectFor(null);
									setRejectNote("");
								}}
								disabled={busyId != null}
							>
								Batal
							</Button>
							<Button
								type='button'
								variant='danger'
								loading={busyId === rejectFor.id}
								onClick={submitReject}
							>
								Tolak
							</Button>
						</div>
					</div>
				</div>
			)}
		</MainShell>
	);
}
