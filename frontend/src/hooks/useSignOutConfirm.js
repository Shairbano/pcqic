import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

/**
 * useSignOutConfirm
 *
 * The confirm-dialog + logout + redirect-to-login sequence used identically
 * by AdminDashboard.jsx and UserDashboard.jsx as their `handleSignOut`.
 */
export default function useSignOutConfirm() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    logout();
    navigate('/login');
  };
}