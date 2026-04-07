/**
 * SawerPanel — coin gifting UI inside video call.
 * Feature 3: kirim sawer koin, bisa dicairkan jadi uang.
 */
import { useState, useEffect, useCallback } from "react";
import { X, Coins } from "lucide-react";
import { coinService } from "../../services/coinService";
import toast from "react-hot-toast";

const PRESET_AMOUNTS = [
	{ amount: 100,  label: "100",   emoji: "🪙" },
	{ amount: 500,  label: "500",   emoji: "💰" },
	{ amount: 1000, label: "1K",    emoji: "💎" },
	{ amount: 5000, label: "5K",    emoji: "👑" },
];

export default function SawerPanel({ onClose, onSend, roomId, receiverIdentity }) {
	const [balance, setBalance]   = useState(null); // null = loading
	const [selected, setSelected] = useState(null);
	const [message, setMessage]   = useState("");
	const [sending, setSending]   = useState(false);

	// Load coin balance
	useEffect(() => {
		coinService
			.getBalance()
			.then((res) => setBalance(res.data.data?.balance ?? 0))
			.catch(() => setBalance(0));
	}, []);

	const handleSend = useCallback(async () => {
		if (!selected) return;
		if (balance !== null && balance < selected) {
			toast.error("Koin tidak cukup. Top-up dulu ya!");
			return;
		}
		setSending(true);
		try {
			await coinService.sawer({
				roomId,
				receiverIdentity,
				amount: selected,
				message: message.trim() || undefined,
			});
			setBalance((b) => (b !== null ? b - selected : b));
			onSend({ amount: selected, message: message.trim() });
			toast.success(`Sawer ${selected.toLocaleString()} koin terkirim! 🎉`);
			onClose();
		} catch {
			// Backend belum ada — kirim lewat data channel saja
			onSend({ amount: selected, message: message.trim() });
			toast("Sawer terkirim! (Backend belum terhubung)", { icon: "ℹ️" });
			onClose();
		} finally {
			setSending(false);
		}
	}, [selected, balance, message, roomId, receiverIdentity, onSend, onClose]);

	return (
		<div className='absolute bottom-20 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-[#2d2f33] p-4 shadow-2xl ring-1 ring-white/10'>
			{/* Header */}
			<div className='mb-3 flex items-center justify-between'>
				<div className='flex items-center gap-2 text-white font-semibold'>
					<Coins className='w-4 h-4 text-yellow-400' />
					Sawer Koin
				</div>
				<button
					type='button'
					onClick={onClose}
					className='rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white'
				>
					<X className='w-4 h-4' />
				</button>
			</div>

			{/* Balance */}
			<div className='mb-3 rounded-xl bg-yellow-500/10 px-3 py-2 text-center text-sm text-yellow-300'>
				{balance === null ? (
					"Memuat saldo…"
				) : (
					<>
						Saldo kamu:{" "}
						<span className='font-bold text-yellow-200'>
							{balance.toLocaleString()} koin
						</span>
					</>
				)}
			</div>

			{/* Amount presets */}
			<div className='mb-3 grid grid-cols-4 gap-2'>
				{PRESET_AMOUNTS.map(({ amount, label, emoji }) => (
					<button
						key={amount}
						type='button'
						onClick={() => setSelected(amount)}
						className={`flex flex-col items-center rounded-xl py-2 text-xs font-semibold transition-all ${
							selected === amount
								? "bg-yellow-400 text-yellow-900 scale-105 shadow-md"
								: "bg-white/10 text-white hover:bg-white/20"
						}`}
					>
						<span className='text-xl'>{emoji}</span>
						{label}
					</button>
				))}
			</div>

			{/* Message */}
			<input
				type='text'
				placeholder='Pesan (opsional)'
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				maxLength={60}
				className='mb-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-yellow-400'
			/>

			{/* Send button */}
			<button
				type='button'
				disabled={!selected || sending}
				onClick={handleSend}
				className='w-full rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-yellow-900 transition-all hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed'
			>
				{sending
					? "Mengirim…"
					: selected
					? `Sawer ${selected.toLocaleString()} Koin 🎉`
					: "Pilih jumlah dulu"}
			</button>
		</div>
	);
}
