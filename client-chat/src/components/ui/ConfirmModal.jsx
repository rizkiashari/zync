import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Hapus',
  confirmVariant = 'danger',
  loading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={null} size="sm">
    <div className="flex flex-col items-center text-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        confirmVariant === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
      }`}>
        <AlertTriangle className={`w-6 h-6 ${confirmVariant === 'danger' ? 'text-red-600' : 'text-indigo-600'}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
        {message && <p className="text-sm text-slate-500 leading-relaxed">{message}</p>}
      </div>
      <div className="flex gap-3 w-full">
        <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button variant={confirmVariant} fullWidth onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConfirmModal;
