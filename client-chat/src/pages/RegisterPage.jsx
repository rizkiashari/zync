import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User } from "lucide-react";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import { useAuth } from "../context/AuthContext";
import { authLink } from "../lib/uiClasses";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setWorkspace, setWorkspaceList } from "../store/workspaceSlice";
import { workspaceService } from "../services/workspaceService";

const PasswordStrength = ({ password }) => {
	if (!password) return null;
	let score = 0;
	if (password.length >= 8) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	const levels = [
		{ label: "", color: "" },
		{ label: "Lemah", color: "bg-red-500", text: "text-red-600" },
		{ label: "Cukup", color: "bg-amber-500", text: "text-amber-600" },
		{ label: "Kuat", color: "bg-emerald-500", text: "text-emerald-600" },
		{ label: "Sangat Kuat", color: "bg-emerald-600", text: "text-emerald-700" },
	];
	const { label, color, text } = levels[score];

	return (
		<div className='mt-2'>
			<div className='flex gap-1 mb-1' aria-hidden='true'>
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= score ? color : "bg-slate-200"}`}
					/>
				))}
			</div>
			{label && (
				<p className={`text-xs font-medium ${text}`}>Keamanan: {label}</p>
			)}
		</div>
	);
};

const RegisterPage = () => {
	const navigate = useNavigate();
	const { register } = useAuth();
	const dispatch = useDispatch();
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const validate = () => {
		const errs = {};
		if (!form.name.trim()) errs.name = "Nama lengkap wajib diisi";
		else if (form.name.trim().length < 3) errs.name = "Nama minimal 3 karakter";
		if (!form.email.trim()) errs.email = "Email wajib diisi";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = "Format email tidak valid";
		if (!form.password) errs.password = "Kata sandi wajib diisi";
		else if (form.password.length < 8) errs.password = "Minimal 8 karakter";
		if (!form.confirmPassword)
			errs.confirmPassword = "Konfirmasi kata sandi wajib diisi";
		else if (form.password !== form.confirmPassword)
			errs.confirmPassword = "Kata sandi tidak cocok";
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await register(form.email.trim(), form.password, form.name.trim());
			toast.success("Akun berhasil dibuat!");
			const wsRes = await workspaceService.listMine();
			const wsList = wsRes?.data?.data?.workspaces || [];
			if (Array.isArray(wsList) && wsList.length > 0) {
				dispatch(setWorkspaceList(wsList));
				dispatch(setWorkspace(wsList[0]));
				navigate("/dashboard");
			} else {
				// No workspace yet — force user to create or join one
				navigate("/onboarding");
			}
		} catch (err) {
			const msg = err?.message || err?.response?.data?.error?.message;
			toast.error(msg || "Gagal membuat akun, coba lagi");
		} finally {
			setLoading(false);
		}
	};

	const set = (field) => (e) => {
		setForm((prev) => ({ ...prev, [field]: e.target.value }));
		if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
	};

	return (
		<div className='flex min-h-dvh w-full overflow-x-hidden'>
			<div className='hidden lg:flex lg:w-[45%] xl:w-2/5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex-col items-center justify-center p-12 relative overflow-hidden'>
				<div className='absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full' />
				<div className='absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full' />

				<div className='relative z-10 max-w-xs text-center'>
					<div className='flex justify-center mb-6'>
						<div className='w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center shadow-2xl ring-1 ring-white/20'>
							<Logo size={44} variant='white' />
						</div>
					</div>
					<p className='text-3xl font-bold text-white mb-2 tracking-tight'>
						Zync
					</p>
					<p className='text-indigo-100/90 text-base leading-[1.6]'>
						Bergabung sekarang dan mulai percakapan yang berarti bersama teman
						dan kolega.
					</p>
				</div>

				<p className='absolute bottom-6 text-xs text-indigo-300/60'>
					© 2026 Zync
				</p>
			</div>

			<main className='flex flex-1 items-center justify-center overflow-y-auto bg-slate-50 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-12'>
				<div className='w-full max-w-sm'>
					<div className='lg:hidden flex flex-col items-center mb-10'>
						<div className='w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-clean-md mb-3 ring-1 ring-black/5'>
							<Logo size={30} variant='white' />
						</div>
						<p className='text-xl font-bold text-slate-900'>Zync</p>
					</div>

					<header className='mb-8'>
						<h1
							id='register-heading'
							className='text-2xl font-bold text-slate-900 tracking-tight'
						>
							Buat akun
						</h1>
						<p className='text-slate-600 text-sm mt-2 leading-relaxed'>
							Sudah punya akun?{" "}
							<Link to='/login' className={authLink}>
								Masuk
							</Link>
						</p>
					</header>

					<form
						onSubmit={handleSubmit}
						className='space-y-5'
						aria-labelledby='register-heading'
					>
						<Input
							label='Nama lengkap'
							type='text'
							placeholder='Masukkan nama lengkap'
							value={form.name}
							onChange={set("name")}
							error={errors.name}
							icon={User}
							autoComplete='name'
							required
						/>
						<Input
							label='Alamat email'
							type='email'
							placeholder='nama@email.com'
							value={form.email}
							onChange={set("email")}
							error={errors.email}
							icon={Mail}
							autoComplete='email'
							required
						/>
						<div>
							<Input
								label='Kata sandi'
								type='password'
								placeholder='Minimal 8 karakter'
								value={form.password}
								onChange={set("password")}
								error={errors.password}
								icon={Lock}
								autoComplete='new-password'
								required
							/>
							<PasswordStrength password={form.password} />
						</div>
						<Input
							label='Konfirmasi kata sandi'
							type='password'
							placeholder='Ulangi kata sandi'
							value={form.confirmPassword}
							onChange={set("confirmPassword")}
							error={errors.confirmPassword}
							icon={Lock}
							autoComplete='new-password'
							required
						/>

						<Button type='submit' fullWidth size='lg' loading={loading}>
							Daftar
						</Button>
					</form>
				</div>
			</main>
		</div>
	);
};

export default RegisterPage;
