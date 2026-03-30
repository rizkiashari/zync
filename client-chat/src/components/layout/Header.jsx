import { ArrowLeft, Phone, Video, Trash2, Info, Users, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { useCall } from '../../context/CallContext';

const Header = ({ name, status, avatar, onBack, onInfo, showInfo = false, memberCount, onDelete, kanbanPath, roomId }) => {
  const navigate = useNavigate();
  const isOnline = status === 'online';
  const { startCall } = useCall();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack ?? (() => navigate('/dashboard'))}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 lg:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {memberCount ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
        ) : (
          <Avatar name={name} avatar={avatar} size="md" online={isOnline} />
        )}

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate leading-tight">{name}</h2>
          <p className={`text-xs truncate ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
            {memberCount
              ? `${memberCount} anggota`
              : isOnline
              ? 'Online'
              : 'Terakhir dilihat baru-baru ini'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {roomId && (
          <>
            <button
              onClick={() => startCall(roomId, 'voice')}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Panggilan suara"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => startCall(roomId, 'video')}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Panggilan video"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        {kanbanPath && (
          <button
            onClick={() => navigate(kanbanPath)}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Track Task"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
        )}
        {showInfo && (
          <button
            onClick={onInfo}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Info grup"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Hapus percakapan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
