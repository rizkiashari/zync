import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";

const ParticipantList = ({ raisedHands, onClose }) => {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const allParticipants = [localParticipant, ...participants.filter(
    (p) => p.identity !== localParticipant.identity
  )];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 bg-[#2a2d30] border-l border-white/10 flex flex-col z-20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white text-sm font-semibold">
          Peserta ({allParticipants.length})
        </span>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
          aria-label="Tutup daftar peserta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {allParticipants.map((p) => {
          const isLocal = p.identity === localParticipant.identity;
          const isMuted = !p.isMicrophoneEnabled;
          const isCamOff = !p.isCameraEnabled;
          const hasRaisedHand = raisedHands.has(p.identity);

          return (
            <li
              key={p.identity}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {(p.name || p.identity)?.[0]?.toUpperCase() ?? "?"}
                </div>
                {hasRaisedHand && (
                  <span className="absolute -top-1 -right-1 text-sm">✋</span>
                )}
              </div>

              <span className="flex-1 text-white text-xs truncate">
                {p.name || p.identity}
                {isLocal && <span className="text-white/40 ml-1">(Kamu)</span>}
              </span>

              <div className="flex items-center gap-1">
                {isMuted
                  ? <MicOff className="w-3.5 h-3.5 text-red-400" />
                  : <Mic className="w-3.5 h-3.5 text-white/40" />
                }
                {isCamOff
                  ? <VideoOff className="w-3.5 h-3.5 text-red-400" />
                  : <Video className="w-3.5 h-3.5 text-white/40" />
                }
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ParticipantList;
