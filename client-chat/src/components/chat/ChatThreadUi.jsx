import { formatDateDivider } from "../../data/mockData";

export const ChatTypingIndicator = () => (
	<div className='mb-2 flex items-end gap-2'>
		<div className='h-8 w-8 flex-shrink-0' />
		<div className='rounded-br-2xl rounded-tl-2xl rounded-tr-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-clean'>
			<div className='flex items-center gap-1'>
				<span
					className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
					style={{ animationDelay: "0ms" }}
				/>
				<span
					className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
					style={{ animationDelay: "150ms" }}
				/>
				<span
					className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
					style={{ animationDelay: "300ms" }}
				/>
			</div>
		</div>
	</div>
);

export const ChatTypingIndicatorWithName = ({ name }) => (
	<div className='mb-2 flex items-end gap-2'>
		<div className='h-8 w-8 flex-shrink-0' />
		<div className='flex flex-col'>
			{name && (
				<span className='mb-1 ml-1 text-xs text-indigo-600'>{name}</span>
			)}
			<div className='rounded-br-2xl rounded-tl-2xl rounded-tr-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-clean'>
				<div className='flex items-center gap-1'>
					<span
						className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
						style={{ animationDelay: "0ms" }}
					/>
					<span
						className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
						style={{ animationDelay: "150ms" }}
					/>
					<span
						className='h-2 w-2 animate-bounce rounded-full bg-slate-400'
						style={{ animationDelay: "300ms" }}
					/>
				</div>
			</div>
		</div>
	</div>
);

export const ChatDateDivider = ({ date }) => (
	<div className='my-4 flex items-center gap-3'>
		<div className='h-px flex-1 bg-slate-200' />
		<span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500'>
			{formatDateDivider(date)}
		</span>
		<div className='h-px flex-1 bg-slate-200' />
	</div>
);
