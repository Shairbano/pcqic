import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import { useAuth } from '../context/authContext';
import api from '../utils/api';
import ErrorBanner from '../components/ui/ErrorBanner';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Heading from '../components/ui/Heading';
import Text from '../components/ui/Text';

const ChangePassword = () => {
  const { user, login } = useAuth();
  const navigate        = useNavigate();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  const strength = newPassword.length >= 10 ? 4
    : newPassword.length >= 8 ? 3
    : newPassword.length >= 6 ? 2
    : newPassword.length >= 1 ? 1 : 0;

  const strengthLabel = ['', 'Too short', 'Weak', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { newPassword });
      login({ ...user, mustChangePassword: false });
      navigate(user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pms-bg-void)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--pms-bg-modal)] rounded-2xl border border-[var(--pms-bg-header)] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-5">
          <Heading level={2} size="text-xl">Set Your New Password</Heading>
          <Text size="text-sm" color="text-purple-200" className="mt-1">
            Welcome, <span className="font-semibold">{user?.name}</span>! Please set a personal password to continue.
          </Text>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-5 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <Text size="text-sm" color="text-yellow-200" className="leading-relaxed">
            Your account was created with a temporary password. You must set a new personal password before accessing the platform.
          </Text>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

          <ErrorBanner message={error} />

          {/* New password */}
          <div className="space-y-1">
            <Input
              label="New Password"
              icon={HiOutlineLockClosed}
              type={showNew ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              rightElement={
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="text-gray-500 hover:text-white">
                  {showNew ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                </button>
              }
            />

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div className="pt-1">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? strengthColor : 'bg-white/10'}`} />
                  ))}
                </div>
                <Text size="text-xs" color="text-gray-500">{strengthLabel}</Text>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <Input
              label="Confirm Password"
              icon={HiOutlineLockClosed}
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              rightElement={
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="text-gray-500 hover:text-white">
                  {showConfirm ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                </button>
              }
            />
            {confirmPassword.length > 0 && (
              <Text
                size="text-xs"
                color={newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'}
                className="mt-1"
              >
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </Text>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="none"
            rounded="lg"
            loading={submitting}
            iconSize={20}
            className="w-full py-3"
          >
            {submitting ? 'Saving…' : 'Set Password & Continue →'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;