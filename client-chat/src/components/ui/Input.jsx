import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = ({
	label,
	error,
	icon: Icon,
	type = "text",
	placeholder,
	value,
	onChange,
	className = "",
	disabled = false,
	required = false,
	autoComplete,
	...props
}) => {
	const id = useId();
	const errId = `${id}-error`;
	const [showPassword, setShowPassword] = useState(false);
	const isPassword = type === "password";
	const inputType =
		isPassword ?
			showPassword ? "text"
			:	"password"
		:	type;

	return (
		<div className={`flex flex-col gap-1.5 ${className}`}>
			{label && (
				<label htmlFor={id} className='text-sm font-medium text-slate-700'>
					{label}
					{required && (
						<span className='text-red-500 ml-1' aria-hidden='true'>
							*
						</span>
					)}
				</label>
			)}
			<div className='relative'>
				{Icon && (
					<div
						className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
						aria-hidden='true'
					>
						<Icon className='w-4 h-4' />
					</div>
				)}
				<input
					id={id}
					type={inputType}
					placeholder={placeholder}
					value={value}
					onChange={onChange}
					disabled={disabled}
					required={required}
					aria-invalid={error ? "true" : "false"}
					aria-describedby={error ? errId : undefined}
					autoComplete={
						autoComplete ?? (isPassword ? "current-password" : undefined)
					}
					className={`
            w-full min-h-11 px-4 py-2.5 rounded-xl border text-sm
            transition-colors duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent
            disabled:bg-slate-50 disabled:cursor-not-allowed
            ${error ? "border-red-400 bg-red-50 focus-visible:ring-red-500" : "border-slate-200 bg-white hover:border-slate-300"}
            ${Icon ? "pl-10" : ""}
            ${isPassword ? "pr-12" : ""}
          `}
					{...props}
				/>
				{isPassword && (
					<button
						type='button'
						onClick={() => setShowPassword(!showPassword)}
						aria-label={
							showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
						}
						className='absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
					>
						{showPassword ?
							<EyeOff className='w-4 h-4' aria-hidden='true' />
						:	<Eye className='w-4 h-4' aria-hidden='true' />}
					</button>
				)}
			</div>
			{error && (
				<p id={errId} className='text-xs text-red-600 font-medium' role='alert'>
					{error}
				</p>
			)}
		</div>
	);
};

export default Input;
