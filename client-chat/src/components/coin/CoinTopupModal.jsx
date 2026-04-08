import { useState } from "react";
import { X, Coins, CreditCard, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { coinService } from "../../services/coinService";

const TOPUP_PACKAGES = [
	{ coins: 5000, label: "5.000 koin", price: 5000 },
	{ coins: 10000, label: "10.000 koin", price: 10000 },
	{ coins: 25000, label: "25.000 koin", price: 25000 },
	{ coins: 50000, label: "50.000 koin", price: 50000 },
	{ coins: 100000, label: "100.000 koin", price: 100000 },
];

const PAYMENT_METHODS = [
	{ id: "gopay", label: "GoPay" },
	{ id: "qris", label: "QRIS" },
	{ id: "bca", label: "BCA Virtual Account" },
	{ id: "bni", label: "BNI Virtual Account" },
];

const formatIDR = (n) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const CoinTopupModal = ({ onClose, onSuccess }) => {
	const [selected, setSelected] = useState(null);
	const [paymentMethod, setPaymentMethod] = useState("gopay");
	const [loading, setLoading] = useState(false);

	const handleTopup = async () => {
		if (!selected) { toast.error("Pilih paket koin"); return; }
		setLoading(true);
		try {
			const res = await coinService.topupSnap({
				amount: selected.price,
				paymentMethod,
			});
			const { token, coins } = res.data.data ?? res.data;

			// Open Midtrans Snap popup
			if (window.snap) {
				window.snap.pay(token, {
					onSuccess: () => {
						toast.success(`${coins.toLocaleString("id-ID")} koin berhasil ditambahkan!`);
						onSuccess?.();
						onClose();
					},
					onPending: () => toast("Pembayaran pending — koin akan ditambahkan setelah konfirmasi"),
					onError: () => toast.error("Pembayaran gagal"),
					onClose: () => {},
				});
			} else {
				// Fallback: Midtrans snap.js not loaded
				toast.error("Midtrans tidak tersedia. Muat ulang halaman.");
			}
		} catch {
			toast.error("Gagal memulai pembayaran");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4'>
			<div className='w-full max-w-sm bg-white rounded-2xl shadow-xl'>
				{/* Header */}
				<div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100'>
					<div className='flex items-center gap-2'>
						<Coins className='w-5 h-5 text-amber-500' />
						<h2 className='font-semibold text-slate-800'>Top Up Koin</h2>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-full hover:bg-slate-100 text-slate-400'>
						<X className='w-4 h-4' />
					</button>
				</div>

				<div className='px-5 py-4 space-y-4'>
					{/* Packages */}
					<div>
						<p className='text-xs font-medium text-slate-500 uppercase tracking-wide mb-2'>Pilih Paket</p>
						<div className='grid grid-cols-2 gap-2'>
							{TOPUP_PACKAGES.map((pkg) => (
								<button
									key={pkg.coins}
									onClick={() => setSelected(pkg)}
									className={`p-3 rounded-xl border text-left transition-all ${
										selected?.coins === pkg.coins
											? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
											: "border-slate-200 hover:border-amber-300"
									}`}
								>
									<p className='text-sm font-bold text-slate-800'>{pkg.label}</p>
									<p className='text-xs text-slate-500 mt-0.5'>{formatIDR(pkg.price)}</p>
								</button>
							))}
						</div>
					</div>

					{/* Payment method */}
					<div>
						<p className='text-xs font-medium text-slate-500 uppercase tracking-wide mb-2'>Metode Pembayaran</p>
						<div className='space-y-1.5'>
							{PAYMENT_METHODS.map((m) => (
								<button
									key={m.id}
									onClick={() => setPaymentMethod(m.id)}
									className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all ${
										paymentMethod === m.id
											? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
											: "border-slate-200 text-slate-700 hover:border-indigo-200"
									}`}
								>
									<span className='flex items-center gap-2'>
										<CreditCard className='w-4 h-4 opacity-60' />
										{m.label}
									</span>
									{paymentMethod === m.id && <ChevronRight className='w-3.5 h-3.5' />}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className='px-5 pb-5 pt-2 border-t border-slate-100'>
					<button
						onClick={handleTopup}
						disabled={!selected || loading}
						className='w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2'
					>
						<Coins className='w-4 h-4' />
						{loading ? "Memproses..." : selected ? `Bayar ${formatIDR(selected.price)}` : "Pilih Paket"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default CoinTopupModal;
