import { useState } from "react";
import { X, Plus, BarChart2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { pollService } from "../../services/pollService";

const PollCreator = ({ roomId, onClose, onCreated }) => {
	const [question, setQuestion] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [isMultiple, setIsMultiple] = useState(false);
	const [hasExpiry, setHasExpiry] = useState(false);
	const [expiresAt, setExpiresAt] = useState("");
	const [loading, setLoading] = useState(false);

	const addOption = () => {
		if (options.length >= 10) return;
		setOptions((prev) => [...prev, ""]);
	};

	const removeOption = (idx) => {
		if (options.length <= 2) return;
		setOptions((prev) => prev.filter((_, i) => i !== idx));
	};

	const updateOption = (idx, val) => {
		setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
	};

	const handleSubmit = async () => {
		const q = question.trim();
		if (!q) { toast.error("Masukkan pertanyaan poll"); return; }
		const validOptions = options.map((o) => o.trim()).filter(Boolean);
		if (validOptions.length < 2) { toast.error("Minimal 2 pilihan"); return; }

		setLoading(true);
		try {
			const expiresAtISO = hasExpiry && expiresAt ? new Date(expiresAt).toISOString() : null;
			const res = await pollService.create(roomId, {
				question: q,
				options: validOptions,
				isMultiple,
				expiresAt: expiresAtISO,
			});
			onCreated?.(res.data.data?.poll ?? res.data.poll);
			onClose();
		} catch {
			toast.error("Gagal membuat poll");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4'>
			<div className='w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]'>
				{/* Header */}
				<div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100'>
					<div className='flex items-center gap-2'>
						<BarChart2 className='w-5 h-5 text-indigo-500' />
						<h2 className='font-semibold text-slate-800'>Buat Poll</h2>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-full hover:bg-slate-100 text-slate-400'>
						<X className='w-4 h-4' />
					</button>
				</div>

				<div className='flex-1 overflow-y-auto px-5 py-4 space-y-4'>
					{/* Question */}
					<div>
						<label className='text-xs font-medium text-slate-500 uppercase tracking-wide'>Pertanyaan</label>
						<textarea
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder='Tulis pertanyaan poll...'
							rows={2}
							maxLength={300}
							className='w-full mt-1.5 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none'
						/>
					</div>

					{/* Options */}
					<div>
						<label className='text-xs font-medium text-slate-500 uppercase tracking-wide'>Pilihan</label>
						<div className='mt-1.5 space-y-2'>
							{options.map((opt, idx) => (
								<div key={idx} className='flex items-center gap-2'>
									<span className='w-5 text-xs text-slate-400 text-center flex-shrink-0'>{idx + 1}</span>
									<input
										value={opt}
										onChange={(e) => updateOption(idx, e.target.value)}
										placeholder={`Pilihan ${idx + 1}`}
										maxLength={100}
										className='flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
									/>
									<button
										onClick={() => removeOption(idx)}
										disabled={options.length <= 2}
										className='p-1 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 disabled:pointer-events-none transition-colors'
									>
										<X className='w-3.5 h-3.5' />
									</button>
								</div>
							))}
						</div>
						{options.length < 10 && (
							<button
								onClick={addOption}
								className='mt-2 flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium'
							>
								<Plus className='w-3.5 h-3.5' /> Tambah pilihan
							</button>
						)}
					</div>

					{/* Options toggles */}
					<div className='space-y-3'>
						<label className='flex items-center gap-3 cursor-pointer'>
							<div
								onClick={() => setIsMultiple((p) => !p)}
								className={`w-9 h-5 rounded-full transition-colors relative ${isMultiple ? "bg-indigo-500" : "bg-slate-200"}`}
							>
								<span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isMultiple ? "translate-x-4" : ""}`} />
							</div>
							<span className='text-sm text-slate-700'>Boleh pilih lebih dari satu</span>
						</label>

						<label className='flex items-center gap-3 cursor-pointer'>
							<div
								onClick={() => setHasExpiry((p) => !p)}
								className={`w-9 h-5 rounded-full transition-colors relative ${hasExpiry ? "bg-indigo-500" : "bg-slate-200"}`}
							>
								<span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hasExpiry ? "translate-x-4" : ""}`} />
							</div>
							<span className='text-sm text-slate-700 flex items-center gap-1.5'>
								<Clock className='w-3.5 h-3.5' /> Batas waktu
							</span>
						</label>

						{hasExpiry && (
							<input
								type='datetime-local'
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
								min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
								className='w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400'
							/>
						)}
					</div>
				</div>

				<div className='px-5 pb-5 pt-3 border-t border-slate-100'>
					<button
						onClick={handleSubmit}
						disabled={loading}
						className='w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors'
					>
						{loading ? "Membuat..." : "Buat Poll"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default PollCreator;
