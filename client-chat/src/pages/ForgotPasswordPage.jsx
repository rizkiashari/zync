import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import { authLinkSubtle } from "../lib/uiClasses";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const validate = () => {
		if (!email.trim()) {
			setError("Email wajib diisi");
			return false;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setError("Format email tidak valid");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		await new Promise((r) => setTimeout(r, 1200));
		setSent(true);
		toast.success("Link reset terkirim!");
		setLoading(false);
	};

	return (
		<div className='flex min-h-dvh w-full overflow-x-hidden'>
			{/* ── Left brand panel ─────────────────────────────── */}
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
						Tidak perlu khawatir. Kami akan bantu kamu mendapatkan akses
						kembali.
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
						<p className='text-lg font-bold text-slate-900'>Zync</p>
					</div>

					{sent ?
						/* ── Success state ── */
						<div className='text-center'>
							<div className='w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6'>
								<CheckCircle2 className='w-10 h-10 text-emerald-600' />
							</div>
							<h1 className='text-2xl font-bold text-slate-900 tracking-tight mb-2'>
								Email terkirim
							</h1>
							<p className='text-slate-500 text-sm leading-relaxed mb-2'>
								Kami mengirimkan link reset ke
							</p>
							<p className='font-semibold text-slate-800 mb-6'>{email}</p>
							<p className='text-xs text-slate-400 mb-8'>
								Tidak menerima email? Cek folder spam atau
							</p>
							<div className='space-y-3'>
								<Button
									variant='secondary'
									fullWidth
									onClick={() => {
										setSent(false);
										setEmail("");
									}}
								>
									Kirim Ulang
								</Button>
								<Link
									to='/login'
									className={`inline-flex items-center justify-center gap-2 text-sm ${authLinkSubtle}`}
								>
									<ArrowLeft className='w-4 h-4 shrink-0' />
									Kembali ke halaman masuk
								</Link>
							</div>
						</div>
					:	/* ── Form ── */
						<>
							<header className='mb-8' id='forgot-heading'>
								<div className='w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-indigo-200/60'>
									<KeyRound className='w-6 h-6 text-indigo-600' />
								</div>
								<h1 className='text-2xl font-bold text-slate-900 tracking-tight'>
									Lupa kata sandi?
								</h1>
								<p className='text-slate-600 text-sm mt-2 leading-relaxed'>
									Masukkan email dan kami akan kirimkan link reset.
								</p>
							</header>

							<form
								onSubmit={handleSubmit}
								className='space-y-5'
								aria-labelledby='forgot-heading'
							>
								<Input
									label='Alamat email'
									type='email'
									placeholder='nama@email.com'
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setError("");
									}}
									error={error}
									icon={Mail}
									autoComplete='email'
									required
								/>
								<Button type='submit' fullWidth size='lg' loading={loading}>
									Kirim Link Reset
								</Button>
							</form>

							<div className='flex justify-center mt-6'>
								<Link
									to='/login'
									className={`inline-flex items-center gap-2 ${authLinkSubtle}`}
								>
									<ArrowLeft className='w-4 h-4 shrink-0' />
									Kembali ke halaman masuk
								</Link>
							</div>
						</>
					}
				</div>
			</main>
		</div>
	);
};

export default ForgotPasswordPage;
