import { useState, useEffect } from "react";
import { X, Banknote, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { coinService } from "../../services/coinService";

const BANKS = ["BCA", "BNI", "BRI", "Mandiri", "BSI", "CIMB Niaga", "Permata", "Panin", "Danamon"];
const MIN_COINS = 100;

const CoinWithdrawModal = ({ onClose, onSuccess }) => {
	const [balance, setBalance] = useState(null);
	const [coins, setCoins] = useState("");
	const [bankName, setBankName] = useState("");
	const [bankAccount, setBankAccount] = useState("");
	const [accountName, setAccountName] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		coinService.getBalance().then((res) => {
			setBalance(res.data?.data?.balance ?? res.data?.balance ?? 0);
		}).catch(() => {});
	}, []);

	const coinsNum = parseInt(coins, 10) || 0;
	const canSubmit = coinsNum >= MIN_COINS && coinsNum <= (balance ?? 0) && bankName && bankAccount.trim() && accountName.trim();

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setLoading(true);
		try {
			await coinService.withdraw({
				coins: coinsNum,
				bankName,
				bankAccount: bankAccount.trim(),
				accountName: accountName.trim(),
			});
			toast.success("Permintaan penarikan berhasil dikirim! Akan diproses dalam 1-3 hari kerja.");
			onSuccess?.();
			onClose();
		} catch (err) {
			const code = err?.response?.data?.error?.code;
			if (code === "insufficient_coins") {
				toast.error("Koin tidak cukup");
			} else {
				toast.error("Gagal mengajukan penarikan");
			}
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
						<Banknote className='w-5 h-5 text-emerald-500' />
						<h2 className='font-semibold text-slate-800'>Tarik Koin</h2>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-full hover:bg-slate-100 text-slate-400'>
						<X className='w-4 h-4' />
					</button>
				</div>

				<div className='px-5 py-4 space-y-3'>
					{/* Balance display */}
					<div className='bg-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between'>
						<span className='text-sm text-emerald-700'>Saldo koin</span>
						<span className='font-bold text-emerald-700'>
							{balance === null ? "..." : balance.toLocaleString("id-ID")} koin
						</span>
					</div>

					{/* Rate info */}
					<div className='flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2'>
						<AlertTriangle className='w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5' />
						<p className='text-xs text-amber-700'>1 koin = Rp 1. Min. penarikan {MIN_COINS.toLocaleString("id-ID")} koin.</p>
					</div>

					{/* Amount */}
					<div>
						<label className='text-xs font-medium text-slate-500'>Jumlah Koin</label>
						<input
							type='number'
							value={coins}
							onChange={(e) => setCoins(e.target.value)}
							placeholder={`Min. ${MIN_COINS}`}
							min={MIN_COINS}
							max={balance ?? undefined}
							className='w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400'
						/>
						{coinsNum > 0 && (
							<p className='text-xs text-slate-500 mt-1'>= Rp {coinsNum.toLocaleString("id-ID")}</p>
						)}
					</div>

					{/* Bank */}
					<div>
						<label className='text-xs font-medium text-slate-500'>Bank</label>
						<select
							value={bankName}
							onChange={(e) => setBankName(e.target.value)}
							className='w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white'
						>
							<option value=''>Pilih bank...</option>
							{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
						</select>
					</div>

					{/* Account number */}
					<div>
						<label className='text-xs font-medium text-slate-500'>Nomor Rekening</label>
						<input
							value={bankAccount}
							onChange={(e) => setBankAccount(e.target.value)}
							placeholder='Nomor rekening'
							className='w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400'
						/>
					</div>

					{/* Account name */}
					<div>
						<label className='text-xs font-medium text-slate-500'>Nama Pemilik Rekening</label>
						<input
							value={accountName}
							onChange={(e) => setAccountName(e.target.value)}
							placeholder='Nama sesuai rekening'
							className='w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400'
						/>
					</div>
				</div>

				<div className='px-5 pb-5 pt-2 border-t border-slate-100'>
					<button
						onClick={handleSubmit}
						disabled={!canSubmit || loading}
						className='w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors'
					>
						{loading ? "Memproses..." : "Ajukan Penarikan"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default CoinWithdrawModal;
