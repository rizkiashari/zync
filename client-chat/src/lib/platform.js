import { Capacitor } from "@capacitor/core";

/** True when running inside Capacitor iOS/Android shell (not browser). */
export function isNativeApp() {
	return Capacitor.isNativePlatform();
}
