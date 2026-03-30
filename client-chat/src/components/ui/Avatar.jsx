import { API_BASE } from '../../lib/api';

function resolveAvatarSrc(avatar) {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  const path = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `${API_BASE}${path}`;
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const dotSizeMap = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-3.5 h-3.5 border-2',
  '2xl': 'w-4 h-4 border-2',
};

const colorMap = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
];

const getColor = (name) => {
  if (!name) return colorMap[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colorMap[sum % colorMap.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const Avatar = ({ name, avatar, size = 'md', online, className = '' }) => {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const dotClass = dotSizeMap[size] || dotSizeMap.md;
  const bgColor = getColor(name);
  const initials = getInitials(name);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={resolveAvatarSrc(avatar)}
          alt={name}
          className={`${sizeClass} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white select-none`}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotClass} rounded-full border-white ${
            online ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
