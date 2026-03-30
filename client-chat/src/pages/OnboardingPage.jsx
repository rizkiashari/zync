import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Hash, ArrowRight, Link } from 'lucide-react';
import Logo from '../components/ui/Logo';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useWorkspace } from '../context/WorkspaceContext';
import { workspaceService } from '../services/workspaceService';
import toast from 'react-hot-toast';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { switchWorkspace } = useWorkspace();
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (!slugManual) setSlug(slugify(e.target.value));
  };

  const handleSlugChange = (e) => {
    setSlugManual(true);
    setSlug(slugify(e.target.value));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nama workspace wajib diisi');
    setLoading(true);
    try {
      const res = await workspaceService.create(name.trim(), slug || slugify(name));
      const ws = res.data.data.workspace;
      switchWorkspace(ws);
      toast.success(`Workspace "${ws.name}" berhasil dibuat!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Gagal membuat workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteToken.trim()) return toast.error('Token invite wajib diisi');
    setLoading(true);
    try {
      const res = await workspaceService.join(inviteToken.trim());
      const ws = res.data.data.workspace;
      switchWorkspace(ws);
      toast.success(`Berhasil bergabung ke "${ws.name}"!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Token tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-4">
            <Logo size={36} variant="white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Selamat datang di Zync</h1>
          <p className="text-slate-400 text-sm mt-1">Buat atau bergabung ke workspace untuk memulai</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-800 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
              tab === 'create' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Buat Workspace
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
              tab === 'join' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gabung via Invite
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">
                  Nama Workspace
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Contoh: PT Maju Jaya"
                    value={name}
                    onChange={handleNameChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">
                  Slug <span className="text-slate-500 font-normal">(URL workspace)</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="pt-maju-jaya"
                    value={slug}
                    onChange={handleSlugChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"
                  />
                </div>
                {slug && (
                  <p className="text-xs text-slate-500 mt-1">
                    Workspace ID: <span className="text-indigo-400 font-mono">{slug}</span>
                  </p>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
                <span className="flex items-center gap-2">
                  Buat Workspace <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">
                  Token Invite
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tempel token invite di sini"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Minta token invite dari admin workspace yang ingin kamu gabungi.
                </p>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
                <span className="flex items-center gap-2">
                  Gabung Workspace <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">© 2026 Zync</p>
      </div>
    </div>
  );
};

export default OnboardingPage;
