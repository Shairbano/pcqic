// src/components/ui/TextLink.jsx
import { Link } from 'react-router-dom';

const variants = {
  purple: 'text-purple-300 hover:text-purple-100 active:text-purple-400',
  gray:   'text-gray-300 hover:text-white active:text-gray-400',
};

const TextLink = ({
  children,
  to,
  state,
  variant = 'purple',
  className = '',
  onClick,
  ...props
}) => {
  return (
    <Link
      to={to}
      state={state}
      onClick={onClick}
      className={`inline-flex text-sm font-bold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
};

export default TextLink;