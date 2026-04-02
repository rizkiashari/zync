import api from "../lib/api";

export const profileService = {
	get: () => api.get("/api/profile"),

	update: ({ username, avatar, bio }) =>
		api.put("/api/profile", {
			...(username !== undefined && { username }),
			...(avatar !== undefined && { avatar }),
			...(bio !== undefined && { bio }),
		}),

	uploadAvatar: (file) => {
		const form = new FormData();
		form.append("file", file);
		return api.post("/api/profile/avatar", form, {
			headers: { "Content-Type": "multipart/form-data" },
		});
	},

	changePassword: (currentPassword, newPassword) =>
		api.put("/api/profile/password", {
			current_password: currentPassword,
			new_password: newPassword,
		}),

	updateStatus: (statusMessage) =>
		api.put("/api/profile/status", { status_message: statusMessage }),

	updateEmailPreference: (enabled) =>
		api.put("/api/profile", { email_notifications: enabled }),

	updateDND: (enabled) =>
		api.put("/api/profile", { is_dnd: enabled }),
};
