import axios from "axios";
import { Capacitor } from "@capacitor/core";

function resolveApiBase() {
	const env = import.meta.env.VITE_API_URL;
	if (env && String(env).trim()) {
		return String(env).trim().replace(/\/$/, "");
	}

	const platform = Capacitor.getPlatform();
	if (platform === "android") {
		// Emulator: host machine. Physical device: set VITE_API_URL to your LAN IP.
		return "http://10.0.2.2:8080";
	}
	if (platform === "ios") {
		// Simulator often reaches host via localhost. Physical device: set VITE_API_URL.
		return "http://127.0.0.1:8080";
	}

	return "http://localhost:8080";
}

function resolveWsBase(httpBase) {
	try {
		const u = new URL(httpBase);
		const proto = u.protocol === "https:" ? "wss:" : "ws:";
		return `${proto}//${u.host}`;
	} catch {
		return "ws://localhost:8080";
	}
}

export const API_BASE = resolveApiBase();
export const WS_BASE = resolveWsBase(API_BASE);

const api = axios.create({
	baseURL: API_BASE,
	headers: { "Content-Type": "application/json" },
});

// Attach access token + workspace slug on every request
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("access_token");
	if (token) config.headers.Authorization = `Bearer ${token}`;

	try {
		const wsStr = localStorage.getItem("zync_workspace");
		if (wsStr) {
			const ws = JSON.parse(wsStr);
			if (ws?.slug) config.headers["X-Workspace-Slug"] = ws.slug;
		}
	} catch {
		// ignore malformed workspace data
	}

	return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
	failedQueue = [];
};

api.interceptors.response.use(
	(res) => res,
	async (error) => {
		const original = error.config;
		if (error.response?.status === 401 && !original._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				}).then((token) => {
					original.headers.Authorization = `Bearer ${token}`;
					return api(original);
				});
			}
			original._retry = true;
			isRefreshing = true;

			const refreshToken = localStorage.getItem("refresh_token");
			if (!refreshToken) {
				localStorage.removeItem("access_token");
				localStorage.removeItem("refresh_token");
				localStorage.removeItem("zync_user");
				localStorage.removeItem("zync_workspace");
				window.location.href = "/login";
				return Promise.reject(error);
			}

			try {
				const res = await axios.post(`${API_BASE}/auth/refresh`, {
					refresh_token: refreshToken,
				});
				const { access_token, refresh_token } = res.data.data;
				localStorage.setItem("access_token", access_token);
				localStorage.setItem("refresh_token", refresh_token);
				processQueue(null, access_token);
				original.headers.Authorization = `Bearer ${access_token}`;
				return api(original);
			} catch (err) {
				processQueue(err, null);
				localStorage.removeItem("access_token");
				localStorage.removeItem("refresh_token");
				localStorage.removeItem("zync_user");
				localStorage.removeItem("zync_workspace");
				window.location.href = "/login";
				return Promise.reject(err);
			} finally {
				isRefreshing = false;
			}
		}
		return Promise.reject(error);
	},
);

export default api;
