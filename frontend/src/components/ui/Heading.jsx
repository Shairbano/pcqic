const sizeByLevel = {
  1: 'text-3xl',
  2: 'text-2xl',
  3: 'text-lg',
  4: 'text-sm',
};
const tags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' };

const Heading = ({
  level = 2,
  as,
  size,
  weight = 'font-bold',
  color = 'text-white',
  children,
  className = '',
  ...props
}) => {
  const Tag = as || tags[level];
  const sizeClass = size !== undefined ? size : sizeByLevel[level];
  return (
    <Tag className={`${sizeClass} ${weight} ${color} ${className}`} {...props}>
      {children}
    </Tag>
  );
};

export default Heading;