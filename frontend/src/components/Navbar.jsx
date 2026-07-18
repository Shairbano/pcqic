import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import useSignOutConfirm from '../hooks/useSignOutConfirm';
import { Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/images/pms-logo-wide.jpg';
import Button from './ui/Button';

const Navbar = () => {
  const { user } = useAuth();
  const handleLogout = useSignOutConfirm();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath = user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
  const navClass = ({ isActive }) =>
    `px-2 py-1 rounded-md font-medium transition ${
      isActive
        ? 'text-yellow-400'
        : 'text-gray-200 hover:text-yellow-300 hover:bg-white/5'
    }`;

  return (
    <nav className="relative flex justify-between items-center py-1 px-4 md:px-8 bg-[var(--pms-bg-surface)] shadow-md border-b border-[var(--pms-border)]">
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <div className="relative">
          {/* soft ambient glow that breathes behind the logo */}
          <motion.div
            className="absolute -inset-2 rounded-2xl bg-purple-500/25 blur-xl -z-10"
            animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.img
            src={logo}
            alt="Logo"
            className="h-14 md:h-20 w-auto object-contain cursor-pointer"
            initial={{ opacity: 0, y: -14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.06, rotate: [0, -2, 2, 0], transition: { duration: 0.5 } }}
            whileTap={{ scale: 0.94 }}
          />
        </div>
      </Link>

      {/* Nav links (desktop) */}
      <div className="hidden md:flex space-x-6 text-sm ">
        <NavLink to="/" end className={navClass}>
          Home
        </NavLink>
        <span className="text-gray-600">|</span>
        <NavLink to="/groups" className={navClass}>
          Groups
        </NavLink>
      </div>

      {/* Auth buttons (desktop) */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <>
            <Link to={dashboardPath}>
              <Button variant="secondary" rounded="full" size="nav">
                Dashboard
              </Button>
            </Link>
            <Button variant="danger" rounded="full" size="nav" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Link to="/login">
            <Button variant="warning" rounded="full" size="nav">
              Login
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile toggle */}
      <Button
        variant="bare"
        size="none"
        rounded="none"
        weight=""
        icon={mobileOpen ? X : Menu}
        iconSize={22}
        onClick={() => setMobileOpen(p => !p)}
        className="md:hidden text-gray-200 hover:text-white p-2"
      />

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 md:hidden bg-[var(--pms-bg-surface)] border-b border-[var(--pms-border)] shadow-lg flex flex-col p-4 gap-2 z-40 text-sm">
          <NavLink to="/" end className={navClass} onClick={() => setMobileOpen(false)}>Home</NavLink>
          <NavLink to="/groups" className={navClass} onClick={() => setMobileOpen(false)}>Groups</NavLink>
          <div className="border-t border-white/10 my-1" />
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" rounded="full" size="nav" className="w-full">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="danger"
                rounded="full"
                size="nav"
                className="w-full"
                onClick={() => { setMobileOpen(false); handleLogout(); }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="warning" rounded="full" size="nav" className="w-full">
                Login
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;