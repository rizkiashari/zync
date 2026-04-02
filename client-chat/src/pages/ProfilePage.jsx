import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	Camera,
	User,
	Mail,
	Calendar,
	Key,
	LogOut,
	ChevronRight,
	Bell,
} from "lucide-react";
import MainShell from "../components/layout/MainShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { profileService } from "../services/profileService";
import toast from "react-hot-toast";
import { cardClean, focusRing } from "../lib/uiClasses";

/* ─── Action row ─────────────────────────────────────── */
const ActionRow = ({
	icon: Icon,
	label,
	description,
	iconBg,
	iconColor,
	textColor = "text-slate-800",
	onClick,
}) => (
	<button
		type='button'
		onClick={onClick}
		className={`w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group ${focusRing}`}
	>
		<div
			className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}
		>
			<Icon className={`w-5 h-5 ${iconColor}`} />
		</div>
		<div className='flex-1 min-w-0'>
			<p className={`text-sm font-medium ${textColor}`}>{label}</p>
			{description && (
				<p className='text-xs text-slate-400 mt-0.5'>{description}</p>
			)}
		</div>
		<ChevronRight className='w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0' />
	</button>
);

/* ─── Page ───────────────────────────────────────────── */
const ProfilePage = () => {
	const { user, updateUser, logout } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({
		name: user?.username || user?.name || "",
		email: user?.email || "",
		bio: user?.bio || "",
	});
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [edited, setEdited] = useState(false);
	const [emailNotif, setEmailNotif] = useState(
		user?.email_notifications ?? true,
	);
	const [savingEmailNotif, setSavingEmailNotif] = useState(false);
	const avatarInputRef = useRef(null);

	const set = (field) => (e) => {
		setForm((prev) => ({ ...prev, [field]: e.target.value }));
		setEdited(true);
		if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
	};

	const validate = () => {
		const errs = {};
		if (!form.name.trim()) errs.name = "Nama wajib diisi";
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleAvatarChange = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Pilih file gambar (JPEG, PNG, GIF, atau WEBP)");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Ukuran gambar maks. 5 MB");
			return;
		}
		setAvatarUploading(true);
		try {
			const up = await profileService.uploadAvatar(file);
			const avatarPath = up.data.data?.url;
			if (!avatarPath) throw new Error("no url");
			const res = await profileService.update({
				username: form.name.trim(),
				bio: form.bio.trim(),
				avatar: avatarPath,
			});
			updateUser(res.data.data);
			toast.success("Foto profil diperbarui");
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal mengunggah foto");
		} finally {
			setAvatarUploading(false);
		}
	};

	const handleSave = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			const res = await profileService.update({
				username: form.name.trim(),
				bio: form.bio.trim(),
			});
			updateUser(res.data.data);
			toast.success("Profil berhasil disimpan!");
			setEdited(false);
		} catch (err) {
			const msg = err?.response?.data?.error?.message;
			toast.error(msg || "Gagal menyimpan profil");
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		await logout();
		toast.success("Berhasil keluar");
		navigate("/login");
	};

	const handleToggleEmailNotif = async (val) => {
		setEmailNotif(val);
		setSavingEmailNotif(true);
		try {
			await profileService.updateEmailPreference(val);
			toast.success(
				val ? "Notifikasi email diaktifkan" : "Notifikasi email dinonaktifkan",
			);
		} catch {
			setEmailNotif(!val);
			toast.error("Gagal memperbarui preferensi email");
		} finally {
			setSavingEmailNotif(false);
		}
	};

	const joinDate =
		user?.createdAt ?
			new Date(user.createdAt).toLocaleDateString("id-ID", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
		:	"Maret 2026";

	return (
		<MainShell>
			<div className='min-h-0 flex-1 overflow-y-auto'>
				{/* ── Sticky top bar ───────────────────────── */}
				<div className='sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-clean backdrop-blur-md sm:px-6 sm:py-3.5'>
					<button
						type='button'
						onClick={() => navigate("/dashboard")}
						aria-label='Kembali ke beranda'
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<h1 className='text-sm font-semibold text-slate-900'>Profil Saya</h1>
				</div>

				{/* ── Hero banner ──────────────────────────── */}
				<div className='relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-4 pb-20 pt-8 sm:px-6'>
					<div className='absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full' />
					<div className='absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full' />
				</div>

				{/* ── Profile card overlapping banner ──────── */}
				<div className='-mt-12 space-y-4 px-4 pb-8 sm:px-6'>
					<div className='bg-white rounded-3xl border border-slate-200/80 shadow-clean p-6'>
						{/* Avatar */}
						<div className='flex items-end justify-between mb-5'>
							<div className='relative'>
								<input
									ref={avatarInputRef}
									type='file'
									accept='image/jpeg,image/png,image/gif,image/webp'
									className='hidden'
									onChange={handleAvatarChange}
									disabled={avatarUploading}
								/>
								<div className='ring-4 ring-white rounded-full shadow-xl -mt-16'>
									<Avatar name={form.name} avatar={user?.avatar} size='2xl' />
								</div>
								<button
									type='button'
									disabled={avatarUploading}
									onClick={() => avatarInputRef.current?.click()}
									className='absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:pointer-events-none text-white rounded-full flex items-center justify-center shadow-lg transition-colors'
									title='Ganti foto profil'
								>
									<Camera className='w-3.5 h-3.5' />
								</button>
							</div>
						</div>

						{/* Name & meta */}
						<div>
							<h2 className='text-xl font-bold text-slate-900 leading-tight'>
								{form.name}
							</h2>
							<p className='text-sm text-slate-500 mt-0.5'>{form.email}</p>
							{form.bio && (
								<p className='text-sm text-slate-600 mt-2 leading-relaxed'>
									{form.bio}
								</p>
							)}
							<div className='flex items-center gap-1.5 mt-3 text-xs text-slate-400'>
								<Calendar className='w-3.5 h-3.5' />
								Bergabung sejak {joinDate}
							</div>
						</div>
					</div>

					{/* ── Edit form ─────────────────────────── */}
					<div className={`${cardClean} p-5`}>
						<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4'>
							Informasi Profil
						</p>
						<form onSubmit={handleSave} className='space-y-4'>
							<Input
								label='Nama Lengkap'
								type='text'
								placeholder='Masukkan nama lengkap'
								value={form.name}
								onChange={set("name")}
								error={errors.name}
								icon={User}
								required
							/>
							<div>
								<label className='text-sm font-medium text-slate-700 block mb-1.5'>
									Email
								</label>
								<div className='flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500'>
									<Mail className='w-4 h-4 flex-shrink-0' />
									{form.email || user?.email}
								</div>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-700 block mb-1.5'>
									Bio
								</label>
								<textarea
									placeholder='Ceritakan sedikit tentang dirimu...'
									value={form.bio}
									onChange={set("bio")}
									rows={3}
									className='w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent hover:border-slate-300 transition-all resize-none'
								/>
							</div>
							{edited && (
								<Button type='submit' fullWidth loading={loading}>
									Simpan Perubahan
								</Button>
							)}
						</form>
					</div>

					{/* ── Account actions ──────────────────── */}
					<div className={`${cardClean} overflow-hidden`}>
						<div className='px-5 pt-4 pb-2'>
							<p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
								Pengaturan Akun
							</p>
						</div>
						<ActionRow
							icon={Key}
							label='Ubah Kata Sandi'
							description='Perbarui keamanan akun kamu'
							iconBg='bg-indigo-50'
							iconColor='text-indigo-600'
							onClick={() => navigate("/change-password")}
						/>
						<div className='mx-5 h-px bg-slate-50' />
						{/* Email notification toggle */}
						<div className='flex items-center gap-4 p-4 rounded-2xl'>
							<div className='w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0'>
								<Bell className='w-5 h-5 text-amber-600' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-slate-800'>
									Notifikasi Email
								</p>
								<p className='text-xs text-slate-400 mt-0.5'>
									Terima notifikasi via email
								</p>
							</div>
							<button
								type='button'
								role='switch'
								aria-checked={emailNotif}
								disabled={savingEmailNotif}
								onClick={() => handleToggleEmailNotif(!emailNotif)}
								className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${emailNotif ? "bg-indigo-600" : "bg-slate-200"} disabled:opacity-60`}
							>
								<span
									className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotif ? "translate-x-5" : "translate-x-0"}`}
								/>
							</button>
						</div>
						<div className='mx-5 h-px bg-slate-50' />
						<ActionRow
							icon={LogOut}
							label='Keluar'
							description='Keluar dari sesi ini'
							iconBg='bg-red-50'
							iconColor='text-red-500'
							textColor='text-red-600'
							onClick={handleLogout}
						/>
					</div>
				</div>
			</div>
		</MainShell>
	);
};

export default ProfilePage;
