import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Supports two modes:
//  - onClick: "back" just clears local state (e.g. closing an inline detail
//    view without changing the URL) — renders a real <button>.
//  - to: "back" navigates to a URL — renders a react-router <Link>.
const DetailBackButton = ({ to, onClick, children = 'Back', className = '' }) => {
  const sharedClassName = `inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-medium transition cursor-pointer ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName}>
        <ArrowLeft size={15} /> {children}
      </button>
    );
  }

  return (
    <Link to={to} className={sharedClassName}>
      <ArrowLeft size={15} /> {children}
    </Link>
  );
};

export default DetailBackButton;