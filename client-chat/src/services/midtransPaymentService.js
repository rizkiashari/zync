import api from "../lib/api";

export const midtransPaymentService = {
	/**
	 * @param {{ planKey: string; paymentMethod: string }} params
	 */
	createSnapToken: ({ planKey, paymentMethod }) =>
		api.post("/api/payments/midtrans/snap-token", {
			plan_key: planKey,
			payment_method: paymentMethod,
		}),
};
