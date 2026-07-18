import { useState } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import api from '../../utils/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import ErrorBanner from '../ui/ErrorBanner';

const MemberRequest = ({ groupId, onMemberChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/group/search-users?q=${encodeURIComponent(q)}`);
      setResults(res.data.users ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId, userName) => {
    setInviting(userId);
    setErrorMsg('');
    try {
      await api.post(`/group/${groupId}/invite`, { userId });
      setSuccessMsg(`Invite sent to ${userName}`);
      setQuery('');
      setResults([]);
      setTimeout(() => setSuccessMsg(''), 3500);
      onMemberChange?.();
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Failed to invite');
      setTimeout(() => setErrorMsg(''), 3500);
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <Heading level={4} weight="font-semibold" color="text-gray-300" className="flex items-center gap-2">
          <UserPlus size={15} className="text-purple-400" />
          Invite Members
        </Heading>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen((v) => !v);
            setQuery('');
            setResults([]);
            setErrorMsg('');
          }}
        >
          {open ? 'Close' : 'Invite'}
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm mb-3">
          <Check size={14} /> {successMsg}
        </div>
      )}

      <ErrorBanner message={errorMsg} className="mb-3" />

      {open && (
        <div className="bg-[var(--pms-bg-inset)] border border-[var(--pms-border)] rounded-xl p-4">
          <div className="mb-3">
            <Input
              icon={Search}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-[var(--pms-bg-surface)] border-[var(--pms-border)]"
            />
          </div>

          {searching && (
            <Text size="text-xs" color="text-gray-500" className="animate-pulse">Searching...</Text>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <Text size="text-xs" color="text-gray-500" className="italic">No users found.</Text>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-3 bg-[var(--pms-bg-surface)] rounded-lg px-3 py-2.5 border border-white/5"
                >
                  <div className="min-w-0">
                    <Text size="text-sm" weight="font-medium" color="text-white" className="truncate">{u.name}</Text>
                    <Text size="text-xs" color="text-gray-500" className="truncate">{u.email}</Text>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={UserPlus}
                    loading={inviting === u._id}
                    onClick={() => handleInvite(u._id, u.name)}
                  >
                    {inviting === u._id ? 'Sending...' : 'Invite'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberRequest;