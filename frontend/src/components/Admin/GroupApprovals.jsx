import { useState, useCallback } from 'react';
import api from '../../utils/api';
import useCancellableFetch from '../../hooks/useCancellableFetch';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/date';

const GroupApprovals = ({ onCountChange }) => {
  const [actionNote, setActionNote] = useState('');
  const [selected,   setSelected]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fetchPendingGroups = useCallback(
    () => api.get('/admin/groups?status=pending').then(res => res.data.groups ?? []),
    []
  );
  const {
    data: groups, loading, reload,
  } = useCancellableFetch(fetchPendingGroups, [], { logErrors: true });
  const load = async () => {
    const result = await reload();
    if (result !== undefined) onCountChange?.(result.length ?? 0);
  };

  const handleDecision = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/groups/${selected.group._id}/approve`, {
        action: selected.action, adminNote: actionNote,
      });
      setSelected(null);
      setActionNote('');
      load();
    } catch (e) { alert(e.response?.data?.message || 'Action failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading level={2}>Group Approvals</Heading>
        <Text>{groups.length} pending group{groups.length !== 1 ? 's' : ''}</Text>
      </div>

      {loading ? (
        <div className="text-center text-purple-400 animate-pulse py-12">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">✓</div>
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-300" className="mb-2">All caught up!</Heading>
          <Text size="text-sm" color="text-gray-500">No groups awaiting approval.</Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groups.map(g => (
            <div key={g._id} className="bg-[var(--pms-bg-surface)]/80 rounded-2xl border border-purple-900/30 shadow-sm p-6 hover:border-purple-500/50 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Heading level={3} size="text-lg">{g.name}</Heading>
                  <Text size="text-xs" color="text-gray-400" className="mt-0.5">
                    by <span className="text-purple-400 font-medium">{g.createdBy?.name}</span>
                    {' · '}{formatDate(g.createdAt)}
                  </Text>
                </div>
                <Badge variant="yellow">pending</Badge>
              </div>
              <Text size="text-sm" color="text-gray-400" className="mb-5 line-clamp-2">
                {g.description || 'No description provided.'}
              </Text>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  className="flex-1 justify-center"
                  onClick={() => setSelected({ group: g, action: 'approve' })}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 justify-center"
                  onClick={() => setSelected({ group: g, action: 'reject' })}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--pms-bg-modal)] border border-[var(--pms-bg-header)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-4 flex justify-between items-center ${selected.action === 'approve' ? 'bg-green-700' : 'bg-red-700'}`}>
              <Heading level={3} size="" className="capitalize">
                {selected.action} Group: "{selected.group.name}"
              </Heading>
              <button
                onClick={() => { setSelected(null); setActionNote(''); }}
                className="text-white/70 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Textarea
                label={`Note ${selected.action === 'reject' ? '(reason for rejection)' : '(optional)'}`}
                rows={3}
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                placeholder={selected.action === 'reject' ? 'Provide a reason…' : 'Optional message to creator…'}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => { setSelected(null); setActionNote(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant={selected.action === 'approve' ? 'successSolid' : 'dangerSolid'}
                  loading={submitting}
                  onClick={handleDecision}
                >
                  {submitting ? 'Processing…' : `Confirm ${selected.action}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupApprovals;