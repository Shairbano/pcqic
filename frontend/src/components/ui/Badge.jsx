const variants = {
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  green:  'bg-green-500/15  text-green-400  border-green-500/30',
  red:    'bg-red-500/15    text-red-400    border-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  blue:   'bg-blue-500/15   text-blue-400   border-blue-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  gray:   'bg-white/5       text-gray-400   border-white/10',
};

const Badge = ({ children, variant = 'gray', className = '' }) => {
  return (
    <span
      className={`
        inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;