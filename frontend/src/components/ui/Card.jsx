// src/components/ui/Card.jsx
const containerVariants = {
  default: 'bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-purple-900/40',
  stat:    'bg-[var(--pms-bg-deep-6)] rounded-3xl border border-[var(--pms-border)]',
  plain:   'rounded-2xl',
  admin:   'bg-[var(--pms-bg-surface)]/80 rounded-2xl border border-purple-900/30',
};

const hoverVariants = {
  default: 'hover:border-purple-500/50 hover:-translate-y-0.5',
  stat:    'hover:border-[var(--pms-accent-stat-hover)] hover:-translate-y-1',
  plain:   '',
  admin:   'hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/20 hover:-translate-y-0.5',
};

const bodyVariants = {
  default: 'p-6',
  stat:    'p-10 flex flex-col items-center justify-center',
  plain:   'p-5',
  admin:   'p-5',
};

const Card = ({
  children,
  className = '',
  variant = 'default',
  accent = false,
  accentColor = 'from-purple-600 to-indigo-500',
  onClick,
  hoverable = false,
  style,
}) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        overflow-hidden transition-all duration-300
        ${containerVariants[variant]}
        ${hoverable ? `${hoverVariants[variant]} cursor-pointer` : ''}
        ${className}
      `}
    >
      {accent && (
        <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
      )}
      {children}
    </div>
  );
};

Card.Body = ({ children, className = '', variant = 'default' }) => (
  <div className={`${bodyVariants[variant]} ${className}`}>{children}</div>
);

Card.Title = ({ children, className = '' }) => (
  <h3 className={`font-bold text-white text-base ${className}`}>{children}</h3>
);

Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-400 ${className}`}>{children}</p>
);

export default Card;