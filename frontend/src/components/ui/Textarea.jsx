const sizes = {
  md: 'py-2.5 px-4',
  sm: 'py-2 px-3',
};

const Textarea = ({
  label,
  error,
  rows = 3,
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg ${sizes[size]}
          text-white text-sm focus:border-purple-500 outline-none transition
          placeholder-gray-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/60' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Textarea;