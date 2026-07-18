const variants = {
  body:  'text-sm text-gray-400',
  muted: 'text-xs text-gray-500',
  label: 'text-xs text-gray-400 uppercase tracking-wide',
};

const Text = ({
  variant = 'body',
  as: Tag = 'p',
  size,
  color,
  weight,
  children,
  className = '',
  ...props
}) => {
  const hasOverride = size !== undefined || color !== undefined || weight !== undefined;
  const base = hasOverride
    ? [size, color, weight].filter(Boolean).join(' ')
    : (variants[variant] ?? variants.body);
  return (
    <Tag className={`${base} ${className}`} {...props}>
      {children}
    </Tag>
  );
};

export default Text;