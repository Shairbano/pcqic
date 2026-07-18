import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Loading from '../components/ui/Loading';

const RoleBasedRoutes = ({ children, requiredRole = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (requiredRole.length && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};
export default RoleBasedRoutes;