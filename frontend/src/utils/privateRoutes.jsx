import { useAuth } from '../context/authContext'
import { Navigate, useLocation } from 'react-router-dom';
import Loading from '../components/ui/Loading';

const PrivateRoutes = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

export default PrivateRoutes