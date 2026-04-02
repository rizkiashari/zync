import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ShieldCheck, Zap, Users } from "lucide-react";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import { useAuth } from "../context/AuthContext";
import { authLink, authLinkMuted } from "../lib/uiClasses";
import toast from "react-hot-toast";

const Feature = ({ icon: Icon, text }) => (
	<div className='flex items-center gap-3'>
		<div
			className='w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0'
			aria-hidden='true'
		>
			<Icon className='w-4 h-4 text-white' />
		</div>
		<span className='text-sm text-indigo-100 leading-relaxed'>{text}</span>
	</div>
);

const LoginPage = () => {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [form, setForm] = useState({ email: "", password: "" });
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const validate = () => {
		const errs = {};
		if (!form.email.trim()) errs.email = "Email wajib diisi";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = "Format email tidak valid";
		if (!form.password) errs.password = "Kata sandi wajib diisi";
		else if (form.password.length < 8) errs.password = "Minimal 8 karakter";
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await login(form.email, form.password);
			toast.success("Selamat datang kembali!");
			navigate("/dashboard");
		} catch (err) {
			const msg = err?.message || err?.response?.data?.error?.message;
			toast.error(msg || "Email atau kata sandi salah");
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
			{/* ── Left brand panel ─────────────────────────────── */}
			<div className='hidden lg:flex lg:w-[45%] xl:w-2/5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex-col items-center justify-center p-12 relative overflow-hidden'>
				{/* Decorative circles */}
				<div className='absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full' />
				<div className='absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full' />
				<div className='absolute top-1/2 right-8 w-24 h-24 bg-white/5 rounded-full' />

				<div className='relative z-10 max-w-xs text-center'>
					<div className='flex justify-center mb-6'>
						<div className='w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center shadow-2xl ring-1 ring-white/20'>
							<Logo size={44} variant='white' />
						</div>
					</div>
					<p className='text-3xl font-bold text-white mb-2 tracking-tight'>
						Zync
					</p>
					<p className='text-indigo-100/90 text-base leading-[1.6] mb-10 max-w-[28ch] mx-auto'>
						Terhubung dengan siapa saja, kapan saja, secara real-time.
					</p>

					<div className='space-y-4 text-left'>
						<Feature icon={Zap} text='Pesan real-time via WebSocket' />
						<Feature icon={Users} text='Grup chat tanpa batas anggota' />
						<Feature icon={ShieldCheck} text='Aman & terenkripsi' />
					</div>
				</div>

				<p className='absolute bottom-6 text-xs text-indigo-300/60'>
					© 2026 Zync
				</p>
			</div>

			{/* ── Right form panel ─────────────────────────────── */}
			<main className='flex flex-1 items-center justify-center overflow-y-auto bg-slate-50 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-12'>
				<div className='w-full max-w-sm'>
					{/* Mobile logo */}
					<div className='lg:hidden flex flex-col items-center mb-10'>
						<div className='w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-clean-md mb-3 ring-1 ring-black/5'>
							<Logo size={30} variant='white' />
						</div>
						<p className='text-xl font-bold text-slate-900'>Zync</p>
					</div>

					<header className='mb-8'>
						<h1
							id='login-heading'
							className='text-2xl font-bold text-slate-900 tracking-tight'
						>
							Masuk
						</h1>
						<p className='text-slate-600 text-sm mt-2 leading-relaxed'>
							Belum punya akun?{" "}
							<Link to='/register' className={authLink}>
								Daftar sekarang
							</Link>
						</p>
					</header>

					<form
						onSubmit={handleSubmit}
						className='space-y-5'
						aria-labelledby='login-heading'
					>
						<Input
							label='Alamat Email'
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
								label='Kata Sandi'
								type='password'
								placeholder='Masukkan kata sandi'
								value={form.password}
								onChange={set("password")}
								error={errors.password}
								icon={Lock}
								required
							/>
							<div className='flex justify-end mt-1.5'>
								<Link to='/forgot-password' className={authLinkMuted}>
									Lupa kata sandi?
								</Link>
							</div>
						</div>

						<Button
							type='submit'
							fullWidth
							size='lg'
							loading={loading}
							className='mt-2'
						>
							Masuk
						</Button>
					</form>
				</div>
			</main>
		</div>
	);
};

export default LoginPage;
