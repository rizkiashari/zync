import { useState } from "react";
import { X, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";
import { scheduledMessageService } from "../../services/scheduledMessageService";

const ScheduleMessageModal = ({ roomId, text, replyTo, onClose, onScheduled }) => {
	const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
	const [scheduledAt, setScheduledAt] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSchedule = async () => {
		if (!scheduledAt) { toast.error("Pilih waktu pengiriman"); return; }
		const dt = new Date(scheduledAt);
		if (dt <= new Date(Date.now() + 30_000)) {
			toast.error("Waktu harus minimal 30 detik ke depan");
			return;
		}
		setLoading(true);
		try {
			await scheduledMessageService.schedule(roomId, {
				content: text,
				scheduledAt: dt.toISOString(),
				replyToId: replyTo?.id ?? null,
			});
			toast.success("Pesan dijadwalkan!");
			onScheduled?.();
			onClose();
		} catch {
			toast.error("Gagal menjadwalkan pesan");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4'>
			<div className='w-full max-w-sm bg-white rounded-2xl shadow-xl'>
				<div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100'>
					<div className='flex items-center gap-2'>
						<Clock className='w-5 h-5 text-indigo-500' />
						<h2 className='font-semibold text-slate-800'>Jadwalkan Pesan</h2>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-full hover:bg-slate-100 text-slate-400'>
						<X className='w-4 h-4' />
					</button>
				</div>

				<div className='px-5 py-4 space-y-4'>
					{/* Preview */}
					<div className='bg-slate-50 rounded-xl px-3 py-2 border border-slate-200'>
						<p className='text-xs text-slate-400 mb-1'>Pesan yang akan dikirim:</p>
						<p className='text-sm text-slate-700 line-clamp-3'>{text}</p>
					</div>

					{/* DateTime picker */}
					<div>
						<label className='text-xs font-medium text-slate-500'>Waktu Pengiriman</label>
						<input
							type='datetime-local'
							value={scheduledAt}
							onChange={(e) => setScheduledAt(e.target.value)}
							min={minDate}
							className='w-full mt-1.5 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
						/>
					</div>
				</div>

				<div className='px-5 pb-5 pt-2 border-t border-slate-100'>
					<button
						onClick={handleSchedule}
						disabled={!scheduledAt || loading}
						className='w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2'
					>
						<Send className='w-4 h-4' />
						{loading ? "Menjadwalkan..." : "Jadwalkan"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ScheduleMessageModal;
