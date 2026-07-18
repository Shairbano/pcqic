// src/components/ui/Input.jsx
const variants = {
  default: {
    iconSize: 16,
    iconClass: 'left-3 text-gray-500',
    fieldClass: 'bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg py-2.5 text-white placeholder-gray-500 focus:border-purple-500',
    padLeft:  (hasIcon) => (hasIcon ? 'pl-9' : 'pl-4'),
    padRight: (hasRight) => (hasRight ? 'pr-12' : 'pr-4'),
  },
  hero: {
    iconSize: 18,
    iconClass: 'left-4 text-gray-400',
    fieldClass: 'bg-white border border-white/60 rounded-full py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-purple-300 shadow-lg',
    padLeft:  (hasIcon) => (hasIcon ? 'pl-11' : 'pl-5'),
    padRight: (hasRight) => (hasRight ? 'pr-12' : 'pr-5'),
  },
};

const Input = ({
  label,
  error,
  icon: Icon,
  rightElement,
  variant = 'default',
  className = '',
  ...props
}) => {
  const v = variants[variant];
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={v.iconSize} className={`absolute top-1/2 -translate-y-1/2 ${v.iconClass}`} />
        )}
        <input
          className={`
            w-full outline-none transition text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            ${v.fieldClass}
            ${v.padLeft(!!Icon)} ${v.padRight(!!rightElement)}
            ${error ? 'border-red-500/60' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;