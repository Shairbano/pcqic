import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { Bell } from 'lucide-react';

const AdminInvites = () => {
  const [requests,   setRequests]   = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [inviteRes, joinRes] = await Promise.all([
          api.get('/group?type=requests'),
          api.get('/group?type=join_requests'),
        ]);
        setRequests(inviteRes.data.groups ?? []);
        setJoinRequests(joinRes.data.groups ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleRespond = async (groupId, action) => {
    let reason = '';
    if (action === 'reject') reason = window.prompt('Reason for declining (optional):') ?? '';
    setResponding(groupId);
    try {
      await api.patch(`/group/${groupId}/respond`, { action, reason });
      setRequests(prev => prev.filter(g => g._id !== groupId));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setResponding(null); }
  };

  const handleJoinRespond = async (groupId, memberId, action) => {
    let reason = '';
    if (action === 'reject') reason = window.prompt('Reason for declining (optional):') ?? '';
    setResponding(`${groupId}:${memberId}`);
    try {
      await api.patch(`/group/${groupId}/members/${memberId}/respond`, { action, reason });
      setJoinRequests(prev => prev
        .map(group => ({
          ...group,
          pendingMembers: (group.pendingMembers || []).filter(member => member._id !== memberId),
        }))
        .filter(group => (group.pendingMembers || []).length > 0));
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setResponding(null); }
  };

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading…</div>;

  const totalJoinRequests = joinRequests.reduce((sum, group) => sum + (group.pendingMembers?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <Heading level={2}>Pending Invites</Heading>
        <Text>{requests.length} invitation{requests.length !== 1 ? 's' : ''}, {totalJoinRequests} join request{totalJoinRequests !== 1 ? 's' : ''}</Text>
      </div>

      {requests.length === 0 && totalJoinRequests === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell size={48} className="text-gray-600 mb-4" />
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-400" className="mb-2">No pending invites</Heading>
          <Text size="text-sm" color="text-gray-500">Invites and join requests will appear here.</Text>
        </div>
      ) : (
        <>
        {joinRequests.map(group => (
          <Card key={group._id} variant="admin" className="!border-purple-500/30 shadow-sm">
          <Card.Body variant="admin">
            <Heading level={4} size="" weight="font-semibold">{group.name}</Heading>
            <Text size="text-xs" color="text-gray-400" className="mt-0.5 mb-4">Join requests for this group</Text>
            <div className="space-y-3">
              {(group.pendingMembers || []).map(member => (
                <div key={member._id} className="rounded-xl border border-white/10 bg-[var(--pms-bg-inset)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <Text size="text-sm" weight="font-semibold" color="text-white">{member.userId?.name ?? 'Member'}</Text>
                      <Text size="text-xs" color="text-gray-400">{member.userId?.email}</Text>
                    </div>
                    <Badge variant="yellow">join request</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleJoinRespond(group._id, member._id, 'accept')}
                      disabled={responding === `${group._id}:${member._id}`}
                      variant="successTint"
                      weight="font-medium"
                      className="flex-1"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleJoinRespond(group._id, member._id, 'reject')}
                      disabled={responding === `${group._id}:${member._id}`}
                      variant="dangerTint"
                      weight="font-medium"
                      className="flex-1"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
          </Card>
        ))}
        {requests.map(g => (
          <Card key={g._id} variant="admin" className="!border-yellow-500/30 shadow-sm">
          <Card.Body variant="admin">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Heading level={4} size="" weight="font-semibold">{g.name}</Heading>
                <Text size="text-xs" color="text-gray-400" className="mt-0.5">Invited by {g.groupHead?.name ?? g.createdBy?.name ?? '—'}</Text>
              </div>
              <Badge variant="yellow">invited</Badge>
            </div>
            <Text size="text-xs" color="text-gray-400" className="mb-4 line-clamp-2">{g.description || 'No description.'}</Text>
            <div className="flex gap-2">
              <Button
                onClick={() => handleRespond(g._id, 'accept')}
                disabled={responding === g._id}
                variant="successTint"
                weight="font-medium"
                className="flex-1"
              >
                Accept
              </Button>
              <Button
                onClick={() => handleRespond(g._id, 'reject')}
                disabled={responding === g._id}
                variant="dangerTint"
                weight="font-medium"
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          </Card.Body>
          </Card>
        ))}
        </>
      )}
    </div>
  );
};

export default AdminInvites;