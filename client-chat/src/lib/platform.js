import { Capacitor } from "@capacitor/core";

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
