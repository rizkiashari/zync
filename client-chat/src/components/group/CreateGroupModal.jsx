import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { X, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/index';
import { createGroupRoom } from '../../store/roomsSlice';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../context/AuthContext';

const CreateGroupModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [membersLoadStatus, setMembersLoadStatus] = useState('idle');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setMembersLoadStatus('loading');
    setWorkspaceMembers([]);
    workspaceService
      .listMembers()
      .then((res) => {
        if (cancelled) return;
        setWorkspaceMembers(res?.data?.data?.members || []);
        setMembersLoadStatus('succeeded');
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceMembers([]);
        setMembersLoadStatus('succeeded');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** Hanya anggota workspace saat ini — bukan seluruh user di server. */
  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspaceMembers
      .filter((m) => Number(m.user_id) !== Number(user?.id))
      .filter((m) => {
        if (!q) return true;
        return (
          (m.username || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q)
        );
      })
      .map((m) => ({
        id: m.user_id,
        username: m.username,
        email: m.email,
        is_online: false,
      }));
  }, [workspaceMembers, search, user?.id]);

  const toggleMember = (contact) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m.id === contact.id)
        ? prev.filter((m) => m.id !== contact.id)
        : [...prev, contact]
    );
  };

  const validate = () => {
    const errs = {};
    if (!groupName.trim()) errs.groupName = 'Nama grup wajib diisi';
    if (selectedMembers.length < 1) errs.members = 'Pilih minimal 1 anggota';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await dispatch(createGroupRoom({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedMembers.map((m) => m.id),
      }));
      if (createGroupRoom.rejected.match(result)) throw new Error(result.payload);
      const newRoom = result.payload;
      toast.success(`Grup "${groupName}" berhasil dibuat!`);
      handleClose();
      navigate(`/group/${newRoom.id}`);
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat grup');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    setSearch('');
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Buat Grup Baru" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <Input
              label="Nama Grup"
              placeholder="Contoh: Tim Frontend"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              error={errors.groupName}
              required
            />
          </div>
        </div>

        <Input
          label="Deskripsi (opsional)"
          placeholder="Deskripsi singkat tentang grup ini"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Tambah Anggota <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Hanya rekan di workspace ini yang bisa dipilih.
          </p>

          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {member.username || member.email}
                  <button onClick={() => toggleMember(member)} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            placeholder="Cari di anggota workspace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
          />

          {errors.members && (
            <p className="text-xs text-red-500 mb-2">{errors.members}</p>
          )}

          <div className="max-h-48 overflow-y-auto scrollbar-light space-y-1 border border-slate-100 rounded-xl p-2">
            {membersLoadStatus === 'loading' && (
              <p className="text-xs text-slate-400 text-center py-4">Memuat anggota workspace...</p>
            )}
            {membersLoadStatus === 'succeeded' && contacts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                Tidak ada anggota lain di workspace ini
              </p>
            )}
            {contacts.map((contact) => {
              const isSelected = !!selectedMembers.find((m) => m.id === contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => toggleMember(contact)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <Avatar name={contact.username || contact.email} size="sm" online={contact.is_online} />
                  <span className="text-sm text-slate-700 flex-1 text-left">{contact.username || contact.email}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 16 16" fill="none" className="w-full h-full p-0.5">
                        <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{selectedMembers.length} anggota dipilih</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} fullWidth>
            Batal
          </Button>
          <Button onClick={handleCreate} loading={loading} fullWidth>
            Buat Grup
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
