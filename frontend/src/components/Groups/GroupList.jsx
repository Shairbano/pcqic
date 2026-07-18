import { useState, useEffect } from 'react';
import { ACCESS, can } from '../../utils/permissions';
import groupService from '../../services/groupService';
import GroupCard from './GroupCard';
import CreateGroupModal from './CreateGroupModel';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { FlaskConical, Plus } from 'lucide-react';

const GroupList = ({ accessLevel }) => {
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error,      setError]      = useState('');

  const loadGroups = () => {
    setLoading(true);
    groupService.getAll()
      .then((r) => setGroups(r.data.groups ?? r.data ?? []))
      .catch(() => setError('Could not load groups.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;

    groupService.getAll()
      .then((r) => { if (!cancelled) setGroups(r.data.groups ?? r.data ?? []); })
      .catch(() => { if (!cancelled) setError('Could not load groups.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Heading level={1}>Groups</Heading>
          <Text size="" color="text-gray-400" className="mt-1">
            {accessLevel === ACCESS.FULL
              ? 'Manage all community groups'
              : 'Your research groups'}
          </Text>
        </div>
        {can.createGroup(accessLevel) && (
          <Button
            icon={Plus}
            onClick={() => setShowCreate(true)}
          >
            New Group
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-[var(--pms-bg-surface)]/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No groups yet"
          description="Create a group to start collaborating."
          action={
            can.createGroup(accessLevel) && (
              <Button icon={Plus} onClick={() => setShowCreate(true)}>
                Create Group
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g, idx) => (
            <GroupCard
              key={g._id}
              group={g}
              index={idx}
              canManage={can.manageMembers(accessLevel)}
              onApprove={
                can.approveGroup(accessLevel)
                  ? () => groupService.approve(g._id).then(loadGroups)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={loadGroups}
      />
    </>
  );
};

export default GroupList;