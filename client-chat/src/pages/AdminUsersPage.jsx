import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Shield } from "lucide-react";
import MainShell from "../components/layout/MainShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { adminService } from "../services/adminService";
import toast from "react-hot-toast";
import { cardClean, focusRing } from "../lib/uiClasses";

const AdminUsersPage = () => {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState(null);
	const [edit, setEdit] = useState(null);

	const load = async (q = search) => {
		setLoading(true);
		try {
			const res = await adminService.listUsers(q);
			setUsers(res.data.data || []);
		} catch (e) {
			const msg = e?.response?.data?.error?.message;
			toast.error(msg || "Gagal memuat pengguna");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load("");
		// eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
	}, []);

	const openEdit = (u) => {
		setEdit({
			id: u.id,
			username: u.username || "",
			bio: u.bio || "",
			is_system_admin: !!u.is_system_admin,
		});
	};

	const saveEdit = async () => {
		if (!edit) return;
		setSavingId(edit.id);
		try {
			const res = await adminService.updateUser(edit.id, {
				username: edit.username.trim(),
				bio: edit.bio.trim(),
				is_system_admin: edit.is_system_admin,
			});
			toast.success("Pengguna diperbarui");
			setUsers((prev) =>
				prev.map((u) => (u.id === edit.id ? res.data.data : u)),
			);
			setEdit(null);
		} catch (e) {
			const msg = e?.response?.data?.error?.message;
			toast.error(msg || "Gagal menyimpan");
		} finally {
			setSavingId(null);
		}
	};

	return (
		<MainShell>
			<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
				<div className='sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-clean backdrop-blur-md sm:px-6 sm:py-3.5'>
					<button
						type='button'
						onClick={() => navigate("/dashboard")}
						aria-label='Kembali ke beranda'
						className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ${focusRing}`}
					>
						<ArrowLeft className='w-5 h-5' />
					</button>
					<div className='flex items-center gap-2 min-w-0'>
						<Shield className='w-5 h-5 text-indigo-600 shrink-0' />
						<h1 className='text-sm font-semibold text-slate-900 tracking-tight truncate'>
							Pemeliharaan — semua pengguna
						</h1>
					</div>
				</div>

				<div className='flex-1 overflow-y-auto p-4 sm:p-6'>
					<div className='mx-auto max-w-4xl space-y-4'>
						<p className='text-sm text-slate-500'>
							Akun maintenance (system admin) dapat melihat dan mengedit profil
							semua pengguna. Ubah sandi lewat alur profil per pengguna jika
							diperlukan.
						</p>

						<div className='flex gap-2 flex-wrap items-end'>
							<div className='flex-1 min-w-[200px]'>
								<Input
									label='Cari'
									placeholder='Email atau nama...'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									icon={Search}
								/>
							</div>
							<Button type='button' onClick={() => load(search)}>
								Cari
							</Button>
						</div>

						<div className={`${cardClean} overflow-hidden`}>
							{loading ?
								<p className='p-6 text-sm text-slate-500'>Memuat...</p>
							:	<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='bg-slate-50 text-left text-slate-500 border-b border-slate-100'>
												<th className='px-4 py-3 font-medium'>ID</th>
												<th className='px-4 py-3 font-medium'>Email</th>
												<th className='px-4 py-3 font-medium'>Username</th>
												<th className='px-4 py-3 font-medium'>Admin</th>
												<th className='px-4 py-3 font-medium' />
											</tr>
										</thead>
										<tbody>
											{users.map((u) => (
												<tr
													key={u.id}
													className='border-b border-slate-50 hover:bg-slate-50/80'
												>
													<td className='px-4 py-3 tabular-nums text-slate-600'>
														{u.id}
													</td>
													<td className='px-4 py-3 text-slate-800'>
														{u.email}
													</td>
													<td className='px-4 py-3 text-slate-700'>
														{u.username}
													</td>
													<td className='px-4 py-3'>
														{u.is_system_admin ?
															<span className='text-indigo-600 font-medium'>
																Ya
															</span>
														:	<span className='text-slate-400'>—</span>}
													</td>
													<td className='px-4 py-3 text-right'>
														<button
															type='button'
															onClick={() => openEdit(u)}
															className={`text-indigo-600 hover:text-indigo-800 font-medium rounded-sm px-1 -mx-1 ${focusRing}`}
														>
															Edit
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
									{users.length === 0 && (
										<p className='p-6 text-slate-500'>Tidak ada pengguna.</p>
									)}
								</div>
							}
						</div>
					</div>
				</div>

				{edit && (
					<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40'>
						<div
							className={`${cardClean} shadow-clean-md max-w-md w-full p-6 space-y-4 ring-1 ring-black/5`}
						>
							<h2 className='text-lg font-semibold text-slate-900'>
								Edit pengguna #{edit.id}
							</h2>
							<Input
								label='Username'
								value={edit.username}
								onChange={(e) =>
									setEdit((s) => ({ ...s, username: e.target.value }))
								}
							/>
							<div>
								<label className='text-sm font-medium text-slate-700 block mb-1.5'>
									Bio
								</label>
								<textarea
									value={edit.bio}
									onChange={(e) =>
										setEdit((s) => ({ ...s, bio: e.target.value }))
									}
									rows={3}
									className='w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
								/>
							</div>
							<label className='flex items-center gap-2 cursor-pointer'>
								<input
									type='checkbox'
									checked={edit.is_system_admin}
									onChange={(e) =>
										setEdit((s) => ({
											...s,
											is_system_admin: e.target.checked,
										}))
									}
									className='rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
								/>
								<span className='text-sm text-slate-700'>System admin</span>
							</label>
							<div className='flex gap-2 justify-end pt-2'>
								<Button
									type='button'
									variant='secondary'
									onClick={() => setEdit(null)}
									disabled={!!savingId}
								>
									Batal
								</Button>
								<Button type='button' onClick={saveEdit} loading={!!savingId}>
									Simpan
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</MainShell>
	);
};

export default AdminUsersPage;
