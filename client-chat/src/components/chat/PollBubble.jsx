import { useState, useCallback } from "react";
import { BarChart2, Check, Clock, Users } from "lucide-react";
import toast from "react-hot-toast";
import { pollService } from "../../services/pollService";

const PollBubble = ({ poll: initialPoll, currentUserId, isOwn }) => {
	const [poll, setPoll] = useState(initialPoll);
	const [votedIds, setVotedIds] = useState(() => new Set());
	const [voting, setVoting] = useState(false);

	const totalVotes = poll.options?.reduce((s, o) => s + (o.vote_count || 0), 0) ?? 0;
	const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

	const handleVote = useCallback(
		async (optionId) => {
			if (voting || isExpired) return;
			if (!poll.is_multiple && votedIds.size > 0) return; // single-choice already voted
			if (poll.is_multiple && votedIds.has(optionId)) return; // already voted this option

			setVoting(true);
			try {
				const res = await pollService.vote(poll.id, optionId);
				const updated = res.data?.data?.poll ?? res.data?.poll;
				const newVotes = res.data?.data?.user_votes ?? res.data?.user_votes ?? [];
				if (updated) setPoll(updated);
				setVotedIds(new Set(newVotes));
			} catch (err) {
				const code = err?.response?.data?.error?.code;
				if (code === "already_voted") {
					toast.error("Kamu sudah memilih");
				} else if (code === "poll_expired") {
					toast.error("Poll sudah berakhir");
				} else {
					toast.error("Gagal memilih");
				}
			} finally {
				setVoting(false);
			}
		},
		[poll, votedIds, voting, isExpired],
	);

	const hasVoted = votedIds.size > 0;

	return (
		<div className={`rounded-2xl border overflow-hidden max-w-xs w-full ${isOwn ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
			{/* Header */}
			<div className={`px-3 py-2 flex items-center gap-2 border-b ${isOwn ? "border-indigo-200 bg-indigo-100/50" : "border-slate-100 bg-slate-50"}`}>
				<BarChart2 className='w-4 h-4 text-indigo-500 flex-shrink-0' />
				<span className='text-xs font-semibold text-indigo-600 uppercase tracking-wide'>Poll</span>
				{isExpired && (
					<span className='ml-auto text-xs text-rose-500 font-medium flex items-center gap-1'>
						<Clock className='w-3 h-3' /> Berakhir
					</span>
				)}
			</div>

			<div className='px-3 py-2.5 space-y-2'>
				{/* Question */}
				<p className='text-sm font-semibold text-slate-800 leading-snug'>{poll.question}</p>

				{/* Options */}
				<div className='space-y-1.5'>
					{(poll.options ?? []).map((opt) => {
						const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
						const isVoted = votedIds.has(opt.id);
						const canVote = !isExpired && !voting && (!hasVoted || (poll.is_multiple && !isVoted));

						return (
							<button
								key={opt.id}
								onClick={() => canVote && handleVote(opt.id)}
								disabled={!canVote}
								className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
									isVoted
										? "border-indigo-400 bg-indigo-50"
										: hasVoted || isExpired
											? "border-slate-100 bg-slate-50 cursor-default"
											: "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer"
								}`}
							>
								{/* Progress bar */}
								{(hasVoted || isExpired) && (
									<div
										className='absolute inset-y-0 left-0 bg-indigo-100 transition-all duration-500'
										style={{ width: `${pct}%` }}
									/>
								)}
								<div className='relative px-3 py-1.5 flex items-center justify-between gap-2'>
									<span className='text-sm text-slate-700 flex-1'>{opt.text}</span>
									<div className='flex items-center gap-1.5 flex-shrink-0'>
										{isVoted && <Check className='w-3.5 h-3.5 text-indigo-500' />}
										{(hasVoted || isExpired) && (
											<span className='text-xs text-slate-500 font-medium w-8 text-right'>{pct}%</span>
										)}
									</div>
								</div>
							</button>
						);
					})}
				</div>

				{/* Footer */}
				<div className='flex items-center gap-1.5 pt-1'>
					<Users className='w-3 h-3 text-slate-400' />
					<span className='text-xs text-slate-400'>{totalVotes} suara</span>
					{poll.is_multiple && <span className='text-xs text-slate-400 ml-auto'>• Pilih lebih dari satu</span>}
					{poll.expires_at && !isExpired && (
						<span className='text-xs text-amber-500 ml-auto'>
							Berakhir {new Date(poll.expires_at).toLocaleDateString("id-ID")}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default PollBubble;
