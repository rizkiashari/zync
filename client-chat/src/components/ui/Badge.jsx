const Badge = ({ count, max = 99, className = '' }) => {
  if (!count || count === 0) return null;
  const display = count > max ? `${max}+` : count;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full
        bg-indigo-600 text-white text-xs font-bold leading-none ${className}`}
    >
      {display}
    </span>
  );
};

export default Badge;
