/**
 * Turns stored message text into a short preview for list rows.
 * File messages are stored as JSON: { _type: "file", url, name, mime, size }.
 */
export function formatChatListMessagePreview(raw) {
	if (raw == null) return "";
	const original = String(raw);
	const s = original.trim();
	if (!s) return "";
	if (!s.startsWith("{")) return original;
	try {
		const parsed = JSON.parse(s);
		if (!parsed || typeof parsed !== "object" || parsed._type !== "file") {
			return original;
		}
		const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
		const mime = typeof parsed.mime === "string" ? parsed.mime : "";
		if (mime.startsWith("image/")) return name ? `Gambar · ${name}` : "Gambar";
		if (mime.startsWith("audio/")) return "Pesan suara";
		return name ? `Berkas · ${name}` : "Berkas";
	} catch {
		return original;
	}
}

/** Lowercase string for search — includes friendly file labels + filename. */
export function chatListMessageSearchText(raw) {
	const preview = formatChatListMessagePreview(raw);
	return String(preview || raw || "").toLowerCase();
}
