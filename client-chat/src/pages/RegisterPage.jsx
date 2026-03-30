import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
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
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      {label && <p className={`text-xs font-medium ${text}`}>Keamanan: {label}</p>}
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nama lengkap wajib diisi';
    else if (form.name.trim().length < 3) errs.name = 'Nama minimal 3 karakter';
    if (!form.email.trim()) errs.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Format email tidak valid';
    if (!form.password) errs.password = 'Kata sandi wajib diisi';
    else if (form.password.length < 8) errs.password = 'Minimal 8 karakter';
    if (!form.confirmPassword) errs.confirmPassword = 'Konfirmasi kata sandi wajib diisi';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.email.trim(), form.password, form.name.trim());
      toast.success('Akun berhasil dibuat!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.message || err?.response?.data?.error?.message;
      toast.error(msg || 'Gagal membuat akun, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 bg-gradient-to-br from-violet-600 via-indigo-700 to-indigo-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full" />

        <div className="relative z-10 max-w-xs text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center shadow-2xl ring-1 ring-white/20">
              <Logo size={44} variant="white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Zync</h1>
          <p className="text-indigo-200 text-base leading-relaxed">
            Bergabung sekarang dan mulai percakapan yang berarti bersama teman dan kolega.
          </p>
        </div>

        <p className="absolute bottom-6 text-xs text-indigo-300/60">© 2026 Zync</p>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <Logo size={30} variant="white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Zync</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Buat Akun</h2>
            <p className="text-slate-500 text-sm mt-1">Sudah punya akun?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Masuk
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              icon={User}
              required
            />
            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={Mail}
              required
            />
            <div>
              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                icon={Lock}
                required
              />
              <PasswordStrength password={form.password} />
            </div>
            <Input
              label="Konfirmasi Kata Sandi"
              type="password"
              placeholder="Ulangi kata sandi"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
              icon={Lock}
              required
            />

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Daftar Sekarang
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
