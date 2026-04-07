import api from '../lib/api';

export const coinService = {
  getBalance: () =>
    api.get('/api/coins/balance'),

  sawer: ({ roomId, receiverIdentity, amount, message }) =>
    api.post('/api/coins/sawer', {
      room_id: roomId,
      receiver_identity: receiverIdentity,
      amount,
      message,
    }),

  topup: ({ amount, paymentMethod }) =>
    api.post('/api/coins/topup', { amount, payment_method: paymentMethod }),

  getTransactions: () =>
    api.get('/api/coins/transactions'),
};
