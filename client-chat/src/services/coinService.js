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

  topupSnap: ({ amount, paymentMethod }) =>
    api.post('/api/coins/topup-snap', { amount, payment_method: paymentMethod }),

  withdraw: ({ coins, bankName, bankAccount, accountName }) =>
    api.post('/api/coins/withdraw', {
      coins,
      bank_name: bankName,
      bank_account: bankAccount,
      account_name: accountName,
    }),

  getWithdrawals: () =>
    api.get('/api/coins/withdrawals'),

  getTransactions: () =>
    api.get('/api/coins/transactions'),
};
