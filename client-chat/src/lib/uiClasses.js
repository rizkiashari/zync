/** Kelas Tailwind bersama untuk UI auth & link yang konsisten (clean + a11y). */
export const focusRing =
	"rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

export const authLink = `${focusRing} text-indigo-600 hover:text-indigo-800 font-semibold underline-offset-2 hover:underline transition-colors`;

export const authLinkMuted = `${focusRing} text-xs font-medium text-indigo-600 hover:text-indigo-800 py-1`;

export const authLinkSubtle = `${focusRing} text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors`;

/** Kartu konten utama: border halus + bayangan ringan */
export const cardClean =
	"bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_0_rgb(15_23_42/0.04),0_1px_2px_-1px_rgb(15_23_42/0.04)]";
