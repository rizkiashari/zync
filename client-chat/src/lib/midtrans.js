/** Midtrans Snap loader — requires VITE_MIDTRANS_CLIENT_KEY and matching sandbox/production. */

const SANDBOX_SCRIPT = "https://app.sandbox.midtrans.com/snap/snap.js";
const PROD_SCRIPT = "https://app.midtrans.com/snap/snap.js";

function scriptURL(isProduction) {
	return isProduction ? PROD_SCRIPT : SANDBOX_SCRIPT;
}

/**
 * @param {string} clientKey
 * @param {boolean} isProduction
 * @returns {Promise<any>}
 */
export function loadMidtransSnap(clientKey, isProduction) {
	const src = scriptURL(isProduction);
	return new Promise((resolve, reject) => {
		if (typeof window === "undefined") {
			reject(new Error("Midtrans Snap hanya dapat dipakai di browser"));
			return;
		}
		if (window.snap) {
			resolve(window.snap);
			return;
		}
		const id = `midtrans-snap-${isProduction ? "prod" : "sandbox"}`;
		let script = document.getElementById(id);
		if (script) {
			const done = () => {
				if (window.snap) resolve(window.snap);
				else reject(new Error("Midtrans Snap tidak tersedia"));
			};
			if (window.snap) {
				done();
				return;
			}
			script.addEventListener("load", done);
			script.addEventListener("error", () =>
				reject(new Error("Gagal memuat Midtrans Snap")),
			);
			return;
		}
		script = document.createElement("script");
		script.id = id;
		script.src = src;
		script.async = true;
		script.setAttribute("data-client-key", clientKey);
		script.onload = () => {
			if (window.snap) resolve(window.snap);
			else reject(new Error("Midtrans Snap tidak tersedia setelah load"));
		};
		script.onerror = () => reject(new Error("Gagal memuat skrip Midtrans"));
		document.body.appendChild(script);
	});
}

/**
 * @param {string} clientKey
 * @param {boolean} isProduction
 * @param {string} token
 * @param {Record<string, Function>} [callbacks]
 */
export async function payWithSnap(clientKey, isProduction, token, callbacks) {
	const snap = await loadMidtransSnap(clientKey, isProduction);
	snap.pay(token, callbacks || {});
}
