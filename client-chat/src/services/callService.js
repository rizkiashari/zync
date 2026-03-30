import api from '../lib/api';

export const callService = {
  // Get LiveKit token + room name to join a call
  getToken: (roomId) =>
    api.post(`/api/rooms/${roomId}/call/token`),

  // Signal to all room members that a call has started
  startCall: (roomId, kind) =>
    api.post(`/api/rooms/${roomId}/call/start`, { kind }),

  // Signal that the call has ended
  endCall: (roomId) =>
    api.post(`/api/rooms/${roomId}/call/end`),
};
