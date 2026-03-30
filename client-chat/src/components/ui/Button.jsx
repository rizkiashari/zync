import { Loader2 } from 'lucide-react';

const variantMap = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:bg-indigo-300',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:bg-red-300',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 disabled:opacity-50',
  'ghost-dark': 'bg-transparent hover:bg-slate-700 text-slate-300 disabled:opacity-50',
  outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-50',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-base rounded-xl',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  fullWidth = false,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${variantMap[variant] || variantMap.primary}
        ${sizeMap[size] || sizeMap.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
