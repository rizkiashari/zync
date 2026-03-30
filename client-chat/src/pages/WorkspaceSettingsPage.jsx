import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	Building2,
	Palette,
	Image,
	Link2,
	RefreshCw,
	Save,
	Upload,
} from "lucide-react";
import { useDispatch } from "react-redux";
import Sidebar from "../components/layout/Sidebar";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useBranding } from "../hooks/useBranding";
import { workspaceService } from "../services/workspaceService";
import { setWorkspace } from "../store/workspaceSlice";
import toast from "react-hot-toast";
import { API_BASE } from "../lib/api";

export default function WorkspaceSettingsPage() {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { displayName, primaryColor, logoURL, description, workspace } =
		useBranding();

	const [form, setForm] = useState({
		custom_name: workspace?.custom_name ?? "",
		primary_color: workspace?.primary_color ?? "#6366f1",
		description: workspace?.description ?? "",
	});
	const [savingBranding, setSavingBranding] = useState(false);
	const [logoPreview, setLogoPreview] = useState(logoURL);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [invite, setInvite] = useState(workspace?.invite_token ?? "");
	const [regenerating, setRegenerating] = useState(false);
	const logoRef = useRef(null);

	const handleChange = (e) => {
		setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
	};

	const handleSaveBranding = async () => {
		setSavingBranding(true);
		try {
			const res = await workspaceService.updateBranding(form);
			const updated = res.data.data.workspace;
			dispatch(setWorkspace(updated));
			toast.success("Branding tersimpan");
		} catch {
			toast.error("Gagal menyimpan branding");
		} finally {
			setSavingBranding(false);
		}
	};

	const handleLogoChange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setLogoPreview(URL.createObjectURL(file));
		setUploadingLogo(true);
		try {
			const res = await workspaceService.uploadLogo(file);
			const updated = res.data.data.workspace;
			dispatch(setWorkspace(updated));
			toast.success("Logo berhasil diupload");
		} catch {
			setLogoPreview(logoURL);
			toast.error("Gagal upload logo");
		} finally {
			setUploadingLogo(false);
		}
	};

	const handleRegenerateInvite = async () => {
		setRegenerating(true);
		try {
			const res = await workspaceService.regenerateInvite();
			setInvite(res.data.data.invite_token);
			toast.success("Link invite diperbarui");
		} catch {
			toast.error("Gagal memperbarui link invite");
		} finally {
			setRegenerating(false);
		}
	};

	const inviteLink = `${window.location.origin}/onboarding?invite=${invite}`;

	const resolvedLogo =
		logoPreview ?
			logoPreview.startsWith("blob:") || logoPreview.startsWith("http") ?
				logoPreview
			:	`${API_BASE}${logoPreview}`
		:	null;

	return (
		<div className='flex h-screen bg-slate-50 overflow-hidden'>
			<Sidebar />
			<div className='flex-1 flex flex-col min-w-0 overflow-y-auto'>
				{/* Header */}
				<div className='sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4'>
					<button
						onClick={() => navigate(-1)}
						className='p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors'
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div>
						<h1 className='text-lg font-bold text-slate-800'>
							Pengaturan Workspace
						</h1>
						<p className='text-xs text-slate-400'>{workspace?.slug}</p>
					</div>
				</div>

				<div className='flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-8'>
					{/* Logo */}
					<section className='bg-white rounded-2xl border border-slate-200 p-6'>
						<div className='flex items-center gap-3 mb-5'>
							<div className='w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center'>
								<Image className='w-5 h-5 text-indigo-600' />
							</div>
							<div>
								<h2 className='text-sm font-semibold text-slate-800'>Logo</h2>
								<p className='text-xs text-slate-400'>
									PNG, JPG, SVG atau WebP. Maks 2 MB.
								</p>
							</div>
						</div>

						<div className='flex items-center gap-5'>
							<div
								className='w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0 border border-slate-200'
								style={{ backgroundColor: form.primary_color }}
							>
								{resolvedLogo ?
									<img
										src={resolvedLogo}
										alt='logo'
										className='w-full h-full object-cover'
									/>
								:	<Logo size={36} variant='white' />}
							</div>
							<div className='flex flex-col gap-2'>
								<input
									ref={logoRef}
									type='file'
									accept='image/png,image/jpeg,image/svg+xml,image/webp'
									className='hidden'
									onChange={handleLogoChange}
								/>
								<Button
									variant='outline'
									size='sm'
									onClick={() => logoRef.current?.click()}
									disabled={uploadingLogo}
									className='flex items-center gap-2'
								>
									<Upload className='w-4 h-4' />
									{uploadingLogo ? "Mengupload..." : "Upload Logo"}
								</Button>
								<p className='text-xs text-slate-400'>
									Digunakan di sidebar dan halaman login.
								</p>
							</div>
						</div>
					</section>

					{/* Branding fields */}
					<section className='bg-white rounded-2xl border border-slate-200 p-6 space-y-5'>
						<div className='flex items-center gap-3 mb-1'>
							<div className='w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center'>
								<Building2 className='w-5 h-5 text-violet-600' />
							</div>
							<div>
								<h2 className='text-sm font-semibold text-slate-800'>
									Identitas Brand
								</h2>
								<p className='text-xs text-slate-400'>
									Nama dan deskripsi yang tampil ke pengguna.
								</p>
							</div>
						</div>

						<div className='space-y-1'>
							<label className='text-xs font-medium text-slate-500'>
								Nama Tampilan
							</label>
							<Input
								name='custom_name'
								placeholder={workspace?.name ?? "Nama workspace"}
								value={form.custom_name}
								onChange={handleChange}
							/>
							<p className='text-xs text-slate-400'>
								Kosongkan untuk menggunakan nama workspace asli:{" "}
								<strong>{workspace?.name}</strong>
							</p>
						</div>

						<div className='space-y-1'>
							<label className='text-xs font-medium text-slate-500'>
								Deskripsi
							</label>
							<textarea
								name='description'
								placeholder='Deskripsi singkat workspace...'
								value={form.description}
								onChange={handleChange}
								rows={3}
								className='w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all'
							/>
						</div>

						{/* Color picker */}
						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<Palette className='w-4 h-4 text-slate-400' />
								<label className='text-xs font-medium text-slate-500'>
									Warna Utama
								</label>
							</div>
							<div className='flex items-center gap-3'>
								<input
									type='color'
									name='primary_color'
									value={form.primary_color}
									onChange={handleChange}
									className='w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white'
								/>
								<Input
									name='primary_color'
									value={form.primary_color}
									onChange={handleChange}
									placeholder='#6366f1'
									className='font-mono text-sm'
								/>
							</div>
							<div className='flex gap-2 flex-wrap'>
								{[
									"#6366f1",
									"#0ea5e9",
									"#10b981",
									"#f59e0b",
									"#ef4444",
									"#8b5cf6",
									"#ec4899",
									"#14b8a6",
								].map((c) => (
									<button
										key={c}
										onClick={() => setForm((f) => ({ ...f, primary_color: c }))}
										className='w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110'
										style={{
											backgroundColor: c,
											borderColor:
												form.primary_color === c ? "#1e293b" : "transparent",
										}}
									/>
								))}
							</div>
						</div>

						<div className='pt-2'>
							<Button
								onClick={handleSaveBranding}
								disabled={savingBranding}
								className='flex items-center gap-2'
							>
								<Save className='w-4 h-4' />
								{savingBranding ? "Menyimpan..." : "Simpan Branding"}
							</Button>
						</div>
					</section>

					{/* Invite link */}
					<section className='bg-white rounded-2xl border border-slate-200 p-6 space-y-4'>
						<div className='flex items-center gap-3'>
							<div className='w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center'>
								<Link2 className='w-5 h-5 text-emerald-600' />
							</div>
							<div>
								<h2 className='text-sm font-semibold text-slate-800'>
									Link Invite
								</h2>
								<p className='text-xs text-slate-400'>
									Bagikan link ini agar anggota baru bisa bergabung.
								</p>
							</div>
						</div>

						<div className='flex gap-2'>
							<input
								readOnly
								value={inviteLink}
								onClick={(e) => e.target.select()}
								className='flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-slate-50 focus:outline-none cursor-pointer font-mono truncate'
							/>
							<button
								onClick={() => {
									navigator.clipboard.writeText(inviteLink);
									toast.success("Link disalin!");
								}}
								className='px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium'
							>
								Salin
							</button>
						</div>

						<Button
							variant='outline'
							size='sm'
							onClick={handleRegenerateInvite}
							disabled={regenerating}
							className='flex items-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50'
						>
							<RefreshCw className='w-4 h-4' />
							{regenerating ? "Memperbarui..." : "Buat Link Baru"}
						</Button>
						<p className='text-xs text-slate-400'>
							Membuat link baru akan menonaktifkan link lama.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
