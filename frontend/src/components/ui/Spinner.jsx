// src/components/ui/Spinner.jsx
const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
};

const Spinner = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`
        animate-spin rounded-full
        border-purple-500/30 border-t-purple-500
        ${sizes[size]} ${className}
      `}
    />
  );
};

export default Spinner;