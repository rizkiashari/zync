import { MessageCircle, Blocks, ShieldCheck } from "lucide-react";

/** Highlight fitur untuk onboarding / halaman harga (iklan). */
export const onboardingHighlightFeatures = [
	{
		key: "realtime",
		title: "Chat real-time yang rapi",
		desc: "Kirim pesan tanpa delay dan tetap fokus berkat layout yang clean.",
		icon: MessageCircle,
	},
	{
		key: "tenant",
		title: "Komunikasi tetap di workspace",
		desc: "Komunikasi tetap berada di workspace yang benar, antar tenant terjaga.",
		icon: ShieldCheck,
	},
	{
		key: "tasks",
		title: "Task Hub + recently opened",
		desc: "Urutan task yang terakhir kamu buka tersimpan dan bisa di-reorder.",
		icon: Blocks,
	},
];
