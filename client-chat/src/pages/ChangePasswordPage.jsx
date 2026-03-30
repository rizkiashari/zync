import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Input from '../components/ui/Input';
import { profileService } from '../services/profileService';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: '', color: '' },
    { label: 'Lemah',       color: 'bg-red-500',     text: 'text-red-500' },
    { label: 'Cukup',       color: 'bg-amber-500',   text: 'text-amber-500' },
    { label: 'Kuat',        color: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Sangat Kuat', color: 'bg-emerald-600', text: 'text-emerald-600' },
  ];
  const { label, color, text } = levels[score];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      {label && <p className={`text-xs font-medium ${text}`}>Keamanan: {label}</p>}
    </div>
  );
};

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.current) errs.current = 'Kata sandi saat ini wajib diisi';
    if (!form.newPass) errs.newPass = 'Kata sandi baru wajib diisi';
    else if (form.newPass.length < 8) errs.newPass = 'Minimal 8 karakter';
    else if (form.newPass === form.current) errs.newPass = 'Kata sandi baru harus berbeda';
    if (!form.confirm) errs.confirm = 'Konfirmasi kata sandi wajib diisi';
    else if (form.newPass !== form.confirm) errs.confirm = 'Kata sandi tidak cocok';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await profileService.changePassword(form.current, form.newPass);
      toast.success('Kata sandi berhasil diubah!');
      navigate('/profile');
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        toast.error('Kata sandi saat ini tidak sesuai');
      } else {
        toast.error(msg || 'Gagal mengubah kata sandi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Ubah Kata Sandi</h1>
            <p className="text-xs text-slate-400">Perbarui keamanan akun kamu</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 py-8 space-y-5">
          {/* Security tip */}
          <div className="flex items-start gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900 mb-0.5">Tips Keamanan</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                Gunakan minimal 8 karakter dengan kombinasi huruf besar, angka, dan simbol untuk kata sandi yang kuat.
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Kata Sandi Saat Ini"
                type="password"
                placeholder="Masukkan kata sandi saat ini"
                value={form.current}
                onChange={set('current')}
                error={errors.current}
                icon={Lock}
                required
              />

              <div className="pt-1 border-t border-slate-100">
                <div>
                  <Input
                    label="Kata Sandi Baru"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={form.newPass}
                    onChange={set('newPass')}
                    error={errors.newPass}
                    icon={Lock}
                    required
                  />
                  <PasswordStrength password={form.newPass} />
                </div>
                <div className="mt-4">
                  <Input
                    label="Konfirmasi Kata Sandi Baru"
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    value={form.confirm}
                    onChange={set('confirm')}
                    error={errors.confirm}
                    icon={Lock}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/profile')}
                  fullWidth
                  type="button"
                >
                  Batal
                </Button>
                <Button type="submit" fullWidth loading={loading}>
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
