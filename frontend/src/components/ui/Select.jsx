const sizes = {
  md: 'py-2.5 px-4',
  sm: 'py-2 px-3',
};

const Select = ({
  label,
  error,
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
      )}
      <select
        className={`
          w-full bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg ${sizes[size]}
          text-white text-sm focus:border-purple-500 outline-none transition
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/60' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;