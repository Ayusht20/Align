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
  const gradient = GRADIENTS[username.charCodeAt(0) % GRADIENTS.length];
  const sizeClass = SIZES[size];

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-orange-400/30 shadow ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow ${className}`}
      style={{
        background: getGradientStyle(gradient),
      }}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function getGradientStyle(gradientClasses: string): string {
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