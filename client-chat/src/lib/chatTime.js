/**
 * Relative time for chat list rows.
 * Hides output when there is no last message or when the API sent a zero/placeholder timestamp
 * (e.g. PostgreSQL COALESCE to 0001-01-01 when no messages).
 */
export function formatChatListTime(dateStr, lastMessage, options = {}) {
	const { minuteSuffix = "" } = options;
	const hasPreview =
		typeof lastMessage === "string" && lastMessage.trim().length > 0;
	if (!hasPreview) return "";
	if (!dateStr) return "";

	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "";
	// Sentinel from server when no messages yet
	if (d.getUTCFullYear() < 1970) return "";

	const now = new Date();
	const diff = now - d;
	const min = Math.floor(diff / 60000);
	const hr = Math.floor(diff / 3600000);
	const day = Math.floor(diff / 86400000);
	if (min < 1) return "Baru saja";
	if (min < 60) return `${min} mnt${minuteSuffix}`;
	if (hr < 24) {
		return d.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	if (day === 1) return "Kemarin";
	return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
