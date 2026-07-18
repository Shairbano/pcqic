// src/components/ui/SearchBar.jsx
import { Search } from 'lucide-react';
import Input from './Input';

const SearchBar = ({ variant = 'default', className = '', ...props }) => {
  return <Input icon={Search} variant={variant} className={className} {...props} />;
};

export default SearchBar;