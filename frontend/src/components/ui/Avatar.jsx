const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-lg',
};

const Avatar = ({
  name,
  size = 'md',
  gradient = 'from-purple-500 to-yellow-400',
  className = '',
}) => (
  <div
    className={`${sizes[size]} rounded-full bg-gradient-to-tr ${gradient} flex-shrink-0 flex items-center justify-center font-bold text-white ${className}`}
    title={name}
  >
    {name?.[0]?.toUpperCase() ?? '?'}
  </div>
);

export default Avatar;