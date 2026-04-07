/**
 * StickerPanel — sticker picker + sticker shop.
 * Feature 4: kirim stiker di video call.
 * Feature 5: beli stiker premium dengan koin.
 */
import { useState, useEffect, useCallback } from "react";
import { X, ShoppingBag, Lock, CheckCircle } from "lucide-react";
import { stickerService } from "../../services/stickerService";
import toast from "react-hot-toast";

// ── Built-in free stickers (always available) ─────────────────────────────────
const FREE_STICKERS = [
	"😂", "🥹", "😍", "😡", "😱", "🙏", "👏", "💪", "👋", "❤️",
	"🔥", "💯", "🎉", "🎊", "🥳", "🎈", "🏆", "⭐", "💫", "✨",
	"🌟", "💎", "🌈", "🎵", "😎", "🤩", "🫶", "🤣", "😭", "🤔",
];

// ── Premium sticker packs ─────────────────────────────────────────────────────
const PREMIUM_PACKS = [
	{
		id: "love",
		name: "Love Pack",
		price: 30,
		preview: ["💝", "💖", "🥰"],
		stickers: ["💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️‍🔥", "🥰", "😘"],
	},
	{
		id: "party",
		name: "Party Pack",
		price: 50,
		preview: ["🎯", "🎪", "🥁"],
		stickers: ["🎯", "🎪", "🎠", "🎡", "🎢", "🎭", "🎬", "🎤", "🎧", "🎼", "🎸", "🥁"],
	},
	{
		id: "food",
		name: "Food Pack",
		price: 25,
		preview: ["🍕", "🍔", "🎂"],
		stickers: ["🍕", "🍔", "🍟", "🍗", "🍣", "🍜", "🌮", "🥙", "🍰", "🧁", "🍩", "☕"],
	},
	{
		id: "animals",
		name: "Animal Pack",
		price: 20,
		preview: ["🐶", "🦊", "🐼"],
		stickers: ["🐶", "🐱", "🐻", "🦊", "🐼", "🐸", "🦁", "🐨", "🐯", "🦋", "🐧", "🦄"],
	},
];

export default function StickerPanel({ onClose, onSend }) {
	const [tab, setTab] = useState("stickers"); // "stickers" | "shop"
	const [owned, setOwned] = useState([]); // owned premium pack IDs
	const [buying, setBuying] = useState(null); // pack ID being purchased

	// Load owned packs
	useEffect(() => {
		stickerService
			.getOwned()
			.then((res) => {
				const ids = (res.data.data?.packs ?? []).map((p) => p.id);
				setOwned(ids);
			})
			.catch(() => setOwned([]));
	}, []);

	const handleSend = useCallback(
		(stickerId) => {
			const x = 10 + Math.floor(Math.random() * 70);
			onSend({ stickerId, x });
			onClose();
		},
		[onSend, onClose],
	);

	const handleBuy = useCallback(async (pack) => {
		setBuying(pack.id);
		try {
			await stickerService.purchase(pack.id);
			setOwned((prev) => [...prev, pack.id]);
			toast.success(`${pack.name} berhasil dibeli! 🎉`);
		} catch {
			toast.error("Gagal membeli stiker. Pastikan koin cukup.");
		} finally {
			setBuying(null);
		}
	}, []);

	// All stickers available to send (free + owned premium packs)
	const availableStickers = [
		...FREE_STICKERS,
		...PREMIUM_PACKS.filter((p) => owned.includes(p.id)).flatMap(
			(p) => p.stickers,
		),
	];

	return (
		<div className='absolute bottom-20 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-[#2d2f33] shadow-2xl ring-1 ring-white/10 overflow-hidden'>
			{/* Tabs */}
			<div className='flex items-center justify-between border-b border-white/10 px-4 pt-3 pb-0'>
				<div className='flex gap-1'>
					<TabBtn
						active={tab === "stickers"}
						onClick={() => setTab("stickers")}
					>
						Stiker
					</TabBtn>
					<TabBtn
						active={tab === "shop"}
						onClick={() => setTab("shop")}
						icon={<ShoppingBag className='w-3 h-3' />}
					>
						Toko
					</TabBtn>
				</div>
				<button
					type='button'
					onClick={onClose}
					className='mb-2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white'
				>
					<X className='w-4 h-4' />
				</button>
			</div>

			{/* Sticker grid */}
			{tab === "stickers" && (
				<div className='grid grid-cols-6 gap-1 p-3 max-h-52 overflow-y-auto scrollbar-none'>
					{availableStickers.map((s, i) => (
						<button
							key={`${s}_${i}`}
							type='button'
							onClick={() => handleSend(s)}
							className='rounded-lg p-1.5 text-2xl leading-none hover:bg-white/15 active:scale-90 transition-transform'
						>
							{s}
						</button>
					))}
				</div>
			)}

			{/* Shop */}
			{tab === "shop" && (
				<div className='flex flex-col gap-2 p-3 max-h-52 overflow-y-auto scrollbar-none'>
					{PREMIUM_PACKS.map((pack) => {
						const isOwned = owned.includes(pack.id);
						const isBuying = buying === pack.id;
						return (
							<div
								key={pack.id}
								className='flex items-center justify-between rounded-xl bg-white/8 px-3 py-2'
							>
								<div className='flex items-center gap-2'>
									<div className='flex gap-0.5 text-xl'>
										{pack.preview.map((s) => (
											<span key={s}>{s}</span>
										))}
									</div>
									<div>
										<p className='text-sm font-semibold text-white'>
											{pack.name}
										</p>
										<p className='text-xs text-white/50'>
											{pack.stickers.length} stiker
										</p>
									</div>
								</div>
								{isOwned ? (
									<div className='flex items-center gap-1 text-xs text-emerald-400 font-medium'>
										<CheckCircle className='w-3.5 h-3.5' />
										Milik
									</div>
								) : (
									<button
										type='button'
										disabled={isBuying}
										onClick={() => handleBuy(pack)}
										className='flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-yellow-900 hover:bg-yellow-300 disabled:opacity-60 transition-colors'
									>
										<span>🪙</span>
										{isBuying ? "…" : pack.price}
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function TabBtn({ active, onClick, icon, children }) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={`mb-0 flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors border-b-2 ${
				active
					? "border-indigo-400 text-white"
					: "border-transparent text-white/50 hover:text-white"
			}`}
		>
			{icon}
			{children}
		</button>
	);
}
