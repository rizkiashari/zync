import api from '../lib/api';

export const pollService = {
  create: (roomId, { question, options, isMultiple, expiresAt }) =>
    api.post(`/api/rooms/${roomId}/polls`, {
      question,
      options,
      is_multiple: isMultiple,
      expires_at: expiresAt ?? null,
    }),

  list: (roomId) =>
    api.get(`/api/rooms/${roomId}/polls`),

  vote: (pollId, optionId) =>
    api.post(`/api/polls/${pollId}/vote`, { option_id: optionId }),

  getMyVotes: (pollId) =>
    api.get(`/api/polls/${pollId}/my-votes`),

  delete: (pollId) =>
    api.delete(`/api/polls/${pollId}`),
};
