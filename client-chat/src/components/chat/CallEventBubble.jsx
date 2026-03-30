import { Phone, Video, PhoneOff } from 'lucide-react';
import { formatMessageTime } from '../../data/mockData';

const CallEventBubble = ({ event }) => {
  const isStart = event.callType === 'call_started';
  const isVideo = event.kind === 'video';
  const time = formatMessageTime(event.timestamp);

  const Icon = isStart ? (isVideo ? Video : Phone) : PhoneOff;
  const label = isStart
    ? `${event.callerName} memulai ${isVideo ? 'video call' : 'voice call'}`
    : `${isVideo ? 'Video call' : 'Voice call'} berakhir`;

  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full">
        <Icon className={`w-3.5 h-3.5 ${isStart ? 'text-emerald-500' : 'text-red-400'}`} />
        <span>{label}</span>
        <span className="text-slate-400">· {time}</span>
      </div>
    </div>
  );
};

export default CallEventBubble;
