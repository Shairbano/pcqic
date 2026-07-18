import { Link } from 'react-router-dom';
const colors = {
  purple: 'text-purple-400 hover:text-purple-300',
  gray:   'text-gray-400 hover:text-white',
  red:    'text-red-400 hover:text-red-300',
  green:  'text-green-400 hover:text-green-300',
};

const sizes = {
  xs: 'text-xs',
  sm: 'text-sm',
};

const IconLink = ({
  to,
  onClick,
  icon: Icon,
  iconSize = 15,
  color = 'purple',
  size = 'sm',
  weight = 'font-medium',
  children,
  className = '',
  ...props
}) => {
  const classes = `inline-flex items-center gap-2 ${sizes[size]} ${weight} transition ${colors[color]} ${className}`;
  const content = (
    <>
      {Icon && <Icon size={iconSize} />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} {...props}>
      {content}
    </button>
  );
};

export default IconLink;