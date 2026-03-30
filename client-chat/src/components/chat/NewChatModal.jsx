import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import { useAppDispatch, useAppSelector } from '../../store/index';
import { searchUsers, clearSearch } from '../../store/usersSlice';
import { createDirectRoom } from '../../store/roomsSlice';

const NewChatModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const contacts = useAppSelector((s) => s.users.searchResults);
  const searchStatus = useAppSelector((s) => s.users.searchStatus);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    dispatch(searchUsers(''));
    return () => {
      dispatch(clearSearch());
      setQuery('');
    };
  }, [isOpen, dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(searchUsers(query));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, dispatch]);

  const handleSelect = async (selectedUser) => {
    onClose();
    const result = await dispatch(createDirectRoom(selectedUser.id));
    const room = result.payload;
    if (room?.id) navigate(`/chat/${room.id}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat Baru" size="sm">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {searchStatus === 'loading' && contacts.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">Mencari...</p>
          )}
          {searchStatus !== 'loading' && contacts.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">
              {query ? 'Pengguna tidak ditemukan' : 'Tidak ada pengguna'}
            </p>
          )}
          {contacts.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <Avatar name={user.username || user.email} size="md" online={user.is_online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user.username || user.email}
                </p>
                {user.username && (
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                )}
              </div>
              {user.is_online && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default NewChatModal;
