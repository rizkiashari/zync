import { Capacitor } from "@capacitor/core";

/**
 * Share or copy a room link.
 *
 * - On Capacitor native: opens the OS share sheet with the deep link.
 * - On mobile browser: attempts to open the app via deep link (zync://);
 *   if the app isn't installed the browser stays on the page. Also copies
 *   the web URL to clipboard.
 * - On desktop browser: copies web URL to clipboard.
 *
 * @param {number|string} roomId
 * @param {string} roomName
 * @param {'chat'|'group'} type  – determines the URL path and deep-link host
 * @returns {Promise<{copied: boolean}>}
 */
export async function shareRoomLink(roomId, roomName, type = "chat") {
	const webUrl = `${window.location.origin}/${type}/${roomId}`;
	const deepLink = `zync://${type}/${roomId}`;
	const title = `Gabung ke ${roomName} di Zync`;

	// Copy web URL to clipboard (best-effort)
	try {
		await navigator.clipboard.writeText(webUrl);
	} catch {
		// Ignore clipboard errors (e.g. insecure context)
	}

	// Native Capacitor app → use OS share sheet with deep link
	if (isNativeApp()) {
		if (navigator.share) {
			try {
				await navigator.share({ title, url: deepLink });
			} catch {
				// User cancelled or share unavailable — clipboard already written
			}
		}
		return { copied: true };
	}

	// Mobile browser → try to launch the app via deep link, then fall back
	const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
	if (isMobile) {
		window.location.href = deepLink;
	}

	return { copied: true };
}

/** True when running inside Capacitor iOS/Android shell (not browser). */
export function isNativeApp() {
	return Capacitor.isNativePlatform();
}

/**
 * Request camera and/or microphone permissions.
 * On native (Android/iOS), triggers the OS permission dialog.
 * On web, triggers the browser permission prompt.
 *
 * @param {'voice'|'video'} kind
 * @returns {Promise<void>} resolves if granted, rejects with Error if denied/failed
 */
export async function requestMediaPermissions(kind = "voice") {
	const constraints =
		kind === "video"
			? { audio: true, video: true }
			: { audio: true, video: false };

	let stream;
	try {
		stream = await navigator.mediaDevices.getUserMedia(constraints);
	} catch (err) {
		if (
			err.name === "NotAllowedError" ||
			err.name === "PermissionDeniedError"
		) {
			throw new Error(
				kind === "video"
					? "Izin kamera dan mikrofon ditolak. Aktifkan di pengaturan aplikasi."
					: "Izin mikrofon ditolak. Aktifkan di pengaturan aplikasi.",
			);
		}
		if (err.name === "NotFoundError") {
			throw new Error(
				kind === "video"
					? "Kamera atau mikrofon tidak ditemukan di perangkat ini."
					: "Mikrofon tidak ditemukan di perangkat ini.",
			);
		}
		throw new Error(`Gagal mengakses perangkat media: ${err.message}`);
	} finally {
		// Release tracks immediately — LiveKit will acquire them again when joining
		if (stream) {
			stream.getTracks().forEach((t) => t.stop());
		}
	}
}
