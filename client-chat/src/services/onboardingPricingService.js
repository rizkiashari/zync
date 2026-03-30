import api from "../lib/api";

export const onboardingPricingService = {
	list: () => api.get("/api/onboarding-pricing"),
	upsert: (plans) =>
		api.put("/api/admin/onboarding-pricing", {
			plans,
		}),
};
