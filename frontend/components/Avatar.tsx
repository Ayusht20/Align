const GRADIENTS = [
  'from-orange-400 to-pink-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-teal-500',
  'from-purple-400 to-pink-500',
  'from-yellow-400 to-orange-500',
];

const SIZES = {
  xs:  'w-7 h-7 text-xs',
  sm:  'w-9 h-9 text-sm',
  md:  'w-12 h-12 text-base',
  lg:  'w-20 h-20 text-2xl',
  xl:  'w-28 h-28 text-3xl',
};

interface AvatarProps {
  url?: string | null;
  username: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function Avatar({ url, username, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = SIZES[size];
  
  // Clean the username string and provide a safe fallback if it's empty
  const cleanUsername = username?.trim() || '?';

  if (url) {
    return (
      <img
        src={url}
        alt={cleanUsername}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-orange-400/30 shadow ${className}`}
      />
    );
  }

  // Safe fallback calculation so charCodeAt never returns NaN
  const charCode = cleanUsername !== '?' ? cleanUsername.charCodeAt(0) : 63;
  const gradient = GRADIENTS[charCode % GRADIENTS.length];

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow ${className}`}
      style={{
        background: getGradientStyle(gradient),
      }}
    >
      {cleanUsername[0].toUpperCase()}
    </div>
  );
}

function getGradientStyle(gradientClasses: string): string {
  // CRITICAL FIX: If gradientClasses is missing or undefined, return a default fallback gradient instantly
  if (!gradientClasses) {
    return 'linear-gradient(135deg, #fb923c, #ec4899)';
  }

  const colorMap: Record<string, string> = {
    'from-orange-400': '#fb923c',
    'from-blue-400':   '#60a5fa',
    'from-green-400':  '#4ade80',
    'from-purple-400': '#c084fc',
    'from-yellow-400': '#facc15',
    'to-pink-500':     '#ec4899',
    'to-indigo-500':   '#6366f1',
    'to-teal-500':     '#14b8a6',
    'to-orange-500':   '#f97316',
  };

  const parts = gradientClasses.split(' ');
  const from  = colorMap[parts[0]] ?? '#fb923c';
  const to    = colorMap[parts[1]] ?? '#ec4899';
  return `linear-gradient(135deg, ${from}, ${to})`;
}