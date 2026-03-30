/**
 * Zync Logo — huruf Z dengan garis diagonal dinamis.
 * Props:
 *   size      — lebar & tinggi (default 40)
 *   variant   — 'color' | 'white' | 'dark'  (default 'color')
 *   className — class tambahan
 */
const Logo = ({ size = 40, variant = 'color', className = '' }) => {
  const id = `zync-grad-${size}`;

  const stroke =
    variant === 'white' ? '#ffffff'
    : variant === 'dark'  ? '#312e81'
    : `url(#${id})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Zync logo"
    >
      {variant === 'color' && (
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      )}

      {/* Z lettermark */}
      <path
        d="M9 12 H31 L9 28 H31"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Logo;
