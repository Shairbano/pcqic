import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineMail, HiOutlineLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import axios from 'axios';
import { useAuth } from '../context/authContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Heading from '../components/ui/Heading';
import Text from '../components/ui/Text';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard', { replace: true });
  }, [user, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');
  const [formData,     setFormData]     = useState({ email: '', password: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const response = await axios.post(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/auth/login',
        { email: formData.email, password: formData.password }
      );

      if (response.data.success) {
        sessionStorage.setItem('token', response.data.token);
        login(response.data.user, response.data.token);

        if (response.data.user.mustChangePassword) {
          navigate('/change-password', { replace: true });
          return;
        }
        navigate(response.data.user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
      }
    } catch (err) {
      const statusCode = err.response?.status;
      if (statusCode === 400) {
        setError('Incorrect password. Please try again.');
      } else if (statusCode === 404) {
        setError('No account found with that email address.');
      } else if (statusCode === 500) {
        setError('Server error. Please try again later.');
      } else if (!err.response) {
        setError('Cannot reach server. Make sure the backend is running on port 3000.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[30vh] flex items-center justify-center p-12">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-[var(--pms-bg-modal)] rounded-2xl overflow-hidden border border-[var(--pms-bg-header)] shadow-2xl">

        {/* Left Side: Branding */}
        <div className="hidden md:flex md:w-1/2 bg-purple-900 relative items-center justify-center p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-[var(--pms-bg-void)] opacity-80" />
          <div className="relative z-10 text-center">
            <Heading level={2} as="h3" className="mb-2">Connect with PMS</Heading>
            <Text className="text-purple-200">Join the PMS network today.</Text>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-[var(--pms-bg-surface)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Heading level={1} as="h2" className="text-center mb-8 tracking-tight">LOGIN</Heading>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <Input
              label="Email"
              icon={HiOutlineMail}
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              placeholder="user@gmail.com"
            />

            <Input
              label="Password"
              icon={HiOutlineLockClosed}
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-white"
                >
                  {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                </button>
              }
            />

            <Button
              type="submit"
              loading={isSubmitting}
              rounded="lg"
              size="block"
              className="w-full active:scale-[0.98]"
            >
              {isSubmitting ? 'Authenticating…' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;