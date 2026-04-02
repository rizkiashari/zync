import api from "../lib/api";

/**
 * Bare token or full/partial URL (?invite=…, /join/…).
 * Stops pasting an onboarding URL from becoming the :token path (404).
 */
export function normalizeWorkspaceInviteToken(raw) {
	const s = String(raw ?? "").trim();
	if (!s) return "";

	const fromQuery = s.match(/[?&#]invite=([a-fA-F0-9]+)/i);
	if (fromQuery) return fromQuery[1];

	try {
		const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
		const u = new URL(withProto);
		const q = u.searchParams.get("invite");
		if (q && /^[a-fA-F0-9]+$/.test(q.trim())) return q.trim();
		const parts = u.pathname.split("/").filter(Boolean);
		const j = parts.indexOf("join");
		if (j >= 0 && parts[j + 1] && /^[a-fA-F0-9]+$/.test(parts[j + 1]))
			return parts[j + 1];
	} catch {
		// not a URL
	}

	const collapsed = s.replace(/\s+/g, "");
	if (/^[a-fA-F0-9]+$/.test(collapsed)) return collapsed;

	return collapsed;
}

export const workspaceService = {
	create: (name, slug) => api.post("/api/workspaces", { name, slug }),
	listMine: () => api.get("/api/workspaces/me"),
	getCurrent: () => api.get("/api/workspaces/current"),
	// Body JSON avoids 404 when pasted links contain "/" (Gin :token is one path segment only).
	join: (raw) => {
		const invite = String(raw ?? "").trim();
		if (!invite) {
			return Promise.reject(new Error("missing_invite_token"));
		}
		return api.post("/api/workspaces/join", { invite });
	},
	getInvite: () => api.get("/api/workspaces/invite"),
	regenerateInvite: () => api.post("/api/workspaces/invite/regenerate"),
	updateBranding: (data) => api.put("/api/workspaces/branding", data),
	uploadLogo: (file) => {
		const fd = new FormData();
		fd.append("logo", file);
		return api.post("/api/workspaces/branding/logo", fd, {
			headers: { "Content-Type": "multipart/form-data" },
		});
	},
	listMembers: () => api.get("/api/workspaces/members"),
	updateMemberRole: (userId, role) =>
		api.put(`/api/workspaces/members/${userId}/role`, { role }),
	removeMember: (userId) => api.delete(`/api/workspaces/members/${userId}`),
	leave: () => api.delete("/api/workspaces/me/leave"),
	deleteWorkspace: () => api.delete("/api/workspaces"),
	getAnalytics: () => api.get("/api/workspaces/analytics"),
	getSubscription: () => api.get("/api/workspaces/subscription"),
	listPaymentTransactions: () =>
		api.get("/api/workspaces/payment-transactions"),
	requestManualPayment: (planKey, { bankName, accountDigits, proofFile }) => {
		const fd = new FormData();
		fd.append("plan_key", planKey);
		fd.append("bank_name", bankName);
		fd.append("account_digits", accountDigits);
		fd.append("proof", proofFile);
		return api.post("/api/workspaces/payment-transactions/request", fd, {
			headers: { "Content-Type": "multipart/form-data" },
		});
	},
};
