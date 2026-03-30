import { useState } from 'react';
import { X } from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#6366f1', '#f59e0b', '#8b5cf6', '#10b981',
  '#ef4444', '#3b82f6', '#ec4899', '#14b8a6',
];

const ColumnModal = ({ boardId, column, onClose, onSaved }) => {
  const isEdit = !!column;
  const [name, setName]   = useState(column?.name ?? '');
  const [color, setColor] = useState(column?.color ?? '#6366f1');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nama kolom wajib diisi'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await taskService.updateColumn(column.id, name.trim(), color);
      } else {
        await taskService.createColumn(boardId, name.trim(), color);
      }
      onSaved();
      onClose();
    } catch {
      toast.error('Gagal menyimpan kolom');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Edit Kolom' : 'Tambah Kolom'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nama Kolom *</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Nama kolom..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Warna</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnModal;
