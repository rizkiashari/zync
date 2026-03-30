import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

const IncomingCallModal = () => {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.kind === 'video';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-72">
        {/* Ripple avatar */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-25" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              {isVideo
                ? <Video className="w-6 h-6 text-white" />
                : <Phone className="w-6 h-6 text-white" />
              }
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">
              {isVideo ? 'Panggilan Video Masuk' : 'Panggilan Suara Masuk'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Dari anggota grup</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={declineCall}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            Tolak
          </button>
          <button
            onClick={acceptCall}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            Terima
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
