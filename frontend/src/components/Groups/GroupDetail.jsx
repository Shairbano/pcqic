import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/authContext';
import groupService from '../../services/groupService';
import ProjectList from '../Projects/ProjectList';
import ProjectDetail from '../Projects/ProjectDetail';
import MemberRequest from './MemberRequest';
import StatusBadge from '../ui/StatusBadge';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Toast from '../ui/Toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Model';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { Trash2, UserMinus, Shield, Clock, AlertCircle, BadgeCheck, Lock, Unlock } from 'lucide-react';

const GroupDetail = ({ groupId, onDeleted, onNestedChange }) => {
  const { user }   = useAuth();
  const [group,    setGroup]   = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast,    setToast]   = useState({ msg: '', type: 'ok' });
  const [leaving, setLeaving] = useState(false);
  const [openProjectId, setOpenProjectIdRaw] = useState(null);
  const [profileModal, setProfileModal] = useState(null); // { loading, data, error }
  const setOpenProjectId = (id) => {
    setOpenProjectIdRaw(id);
    onNestedChange?.(!!id);
  };

  const openProfile = async (uid) => {
    setProfileModal({ loading: true, data: null, error: '' });
    try {
      const res = await groupService.getMemberProfile(groupId, uid);
      setProfileModal({ loading: false, data: res.data.profile, error: '' });
    } catch (e) {
      setProfileModal({ loading: false, data: null, error: e.response?.data?.message || 'Could not load profile.' });
    }
  };

  const showToast = (msg, type = 'ok') => setToast({ msg, type });

  const load = useCallback(() => {
    setLoading(true);
    groupService.getById(groupId)
      .then(r => setGroup(r.data.group ?? r.data))
      .catch(() => setError('Could not load group.'))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <Text size="text-sm" color="text-gray-400" className="animate-pulse">Loading group…</Text>
      </div>
    </div>
  );
  if (error)  return <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl text-sm">{error}</div>;
  if (!group) return null;

  const myId = user?.id?.toString();
  const currentMember = (group.members ?? []).find(m => {
    const uid = m.userId?._id?.toString() ?? m.userId?.toString();
    return uid === myId && m.status === 'accepted';
  });
  const isGroupHead =
    group.groupHead?._id?.toString() === myId ||
    group.groupHead?.toString()       === myId ||
    group.createdBy?._id?.toString()  === myId ||
    group.createdBy?.toString()       === myId ||
    currentMember?.role === 'head' ||
    currentMember?.role === 'admin';
  const isSystemAdmin = user?.role === 'admin';

  const accessLevel = isGroupHead ? 1 : 0;

  const acceptedMembers      = (group.members ?? []).filter(m => m.status === 'accepted');
  const rejectedMembers      = (group.members ?? []).filter(m => m.status === 'rejected');
  const pendingJoinRequests  = (group.members ?? []).filter(m => {
    if (m.status !== 'pending') return false;
    const uid = m.userId?._id?.toString() ?? m.userId?.toString();
    return uid !== myId && m.source === 'join_request';
  });
  const pendingInvitations   = (group.members ?? []).filter(m => {
    if (m.status !== 'pending') return false;
    const uid = m.userId?._id?.toString() ?? m.userId?.toString();
    return uid !== myId && m.source === 'invite';
  });

  const handleDelete = async () => {
    if (!window.confirm(`Move group "${group.name}" to the locked folder?`)) return;
    setDeleting(true);
    try { await groupService.delete(groupId); onDeleted?.(); }
    catch (e) { showToast(e.response?.data?.message || 'Failed to lock group', 'err'); setDeleting(false); }
  };

  const handleRemoveMember = async (uid, name) => {
    if (!window.confirm(`Remove ${name} from the group?`)) return;
    try { await groupService.removeMember(groupId, uid); showToast(`${name} removed.`); load(); }
    catch (e) { showToast(e.response?.data?.message || 'Failed', 'err'); }
  };

  const handleMemberRole = async (uid, name, role) => {
    try {
      await groupService.updateMemberRole(groupId, uid, role);
      showToast(`${name} is now ${role === 'admin' ? 'a group admin' : 'a member'}.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed', 'err');
    }
  };

  const handleLockMember = async (uid, name) => {
    const reason = window.prompt(`Reason for locking ${name}? (required)`);
    if (reason === null) return; // cancelled
    if (!reason.trim()) { showToast('A lock reason is required', 'err'); return; }
    try {
      await groupService.lockMember(groupId, uid, reason.trim());
      showToast(`${name} is now locked.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to lock member', 'err');
    }
  };

  const handleUnlockMember = async (uid, name) => {
    if (!window.confirm(`Unlock ${name}?`)) return;
    try {
      await groupService.unlockMember(groupId, uid);
      showToast(`${name} is now unlocked.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to unlock member', 'err');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Leave "${group.name}"? You'll need to be invited or request to join again.`)) return;
    setLeaving(true);
    try {
      await groupService.leaveGroup(groupId);
      onDeleted?.(); // reuse the same "no longer viewing this group" callback the caller already wires up
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to leave group', 'err');
      setLeaving(false);
    }
  };

  if (group.status === 'pending') return (
    <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-yellow-500/30 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-orange-400" />
      <div className="p-6 flex items-start justify-between">
        <div>
          <Heading level={2} as="h1">{group.name}</Heading>
          <Text className="mt-1">{group.description}</Text>
        </div>
        <Badge variant="yellow">pending</Badge>
      </div>
      <div className="mx-6 mb-6 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <Clock size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <Text size="text-sm" weight="font-semibold" color="text-yellow-300">Awaiting Admin Approval</Text>
          <Text size="text-xs" color="text-yellow-400/70" className="mt-1">Your group is waiting for an admin to approve it.</Text>
        </div>
      </div>
    </div>
  );

  if (group.status === 'rejected') return (
    <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-red-500/30 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-700" />
      <div className="p-6 flex items-start justify-between">
        <div>
          <Heading level={2} as="h1">{group.name}</Heading>
          <Text className="mt-1">{group.description}</Text>
        </div>
        <Badge variant="red">rejected</Badge>
      </div>
      {group.adminNote && (
        <div className="mx-6 mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Text size="text-xs" weight="font-semibold" color="text-red-400" className="uppercase mb-1">Admin Note</Text>
          <Text size="text-sm" color="text-red-300">{group.adminNote}</Text>
        </div>
      )}
    </div>
  );

  /* ── Member card sub-component ── */
  const MemberCard = ({ m, showJoinActions }) => {
    const uid         = m.userId?._id ?? m.userId;
    const name        = m.userId?.name ?? 'Unknown';
    const memberDocId = String(m._id);
    return (
        <div className="flex flex-col gap-2 rounded-xl p-3 bg-[var(--pms-bg-deep-4)] border border-blue-500/15 hover:border-purple-500/50 hover:-translate-y-0.5 transition-all duration-200">        <div
          onClick={() => openProfile(uid)}
          className="flex items-center gap-2 cursor-pointer group/member"
          title="View member details"
        >
          <Avatar name={name} size="md" gradient="from-blue-600 to-purple-500" />
          <div className="min-w-0 flex-1">
            <Text as="p" size="text-xs" weight="font-semibold" color="text-white" className="truncate group-hover/member:text-purple-300 transition">
              {name}
              {uid?.toString() === myId && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-purple-500/20 text-purple-300 align-middle">
                  You
                </span>
              )}
            </Text>
            <div className="flex items-center gap-1">
              {(m.role === 'head' || m.role === 'admin') && <Shield size={10} className={m.role === 'head' ? 'text-yellow-400' : 'text-purple-400'} />}
              <Text size="text-xs" color="text-gray-400" className="capitalize">{m.role}</Text>
              {m.userId?.role && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                  m.userId.role === 'admin' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-blue-500/15 text-blue-300'
                }`}>
                  {m.userId.role}
                </span>
              )}
              {m.locked && (
                <span className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-red-500/15 text-red-300" title={m.lockReason ? `Locked: ${m.lockReason}` : 'Locked'}>
                  <Lock size={9} /> Locked
                </span>
              )}
            </div>
          </div>
          {(isGroupHead || isSystemAdmin) && m.role !== 'head' && !showJoinActions && (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              {m.locked ? (
                <button onClick={() => handleUnlockMember(uid, name)}
                  className="text-red-400 hover:text-green-400 transition" title={`Locked: ${m.lockReason || 'no reason'} — click to unlock`}>
                  <Unlock size={13} />
                </button>
              ) : (
                <>
                  {(isGroupHead || isSystemAdmin) && m.role === 'member' && (
                    <button onClick={() => handleMemberRole(uid, name, 'admin')}
                      className="text-gray-500 hover:text-purple-400 transition" title="Make group admin">
                      <Shield size={13} />
                    </button>
                  )}
                  {(isGroupHead || isSystemAdmin) && m.role === 'admin' && uid?.toString() !== myId && (
                    <button onClick={() => handleMemberRole(uid, name, 'member')}
                      className="text-gray-500 hover:text-yellow-400 transition" title="Remove admin role">
                      <Shield size={13} />
                    </button>
                  )}
                  <button onClick={() => handleLockMember(uid, name)}
                    className="text-gray-500 hover:text-orange-400 transition" title="Lock member">
                    <Lock size={13} />
                  </button>
                  {isGroupHead && (
                    <button onClick={() => handleRemoveMember(uid, name)}
                      className="text-gray-500 hover:text-red-400 transition" title="Remove">
                      <UserMinus size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {showJoinActions && isGroupHead && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <Button
              variant="success"
              size="sm"
              className="flex-1 justify-center"
              onClick={async () => {
                try { await groupService.respondToJoinRequest(groupId, memberDocId, 'accept'); showToast(`${name} approved!`); load(); }
                catch (e) { showToast(e.response?.data?.message || 'Failed', 'err'); }
              }}
            >
              ✓ Accept
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1 justify-center"
              onClick={async () => {
                const reason = window.prompt('Reason (optional):') ?? '';
                try { await groupService.respondToJoinRequest(groupId, memberDocId, 'reject', reason); showToast(`${name} declined.`); load(); }
                catch (e) { showToast(e.response?.data?.message || 'Failed', 'err'); }
              }}
            >
              ✗ Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'ok' })} />

      {/* ── Header ── */}
      <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-blue-900/40 overflow-hidden">
        {group.coverPhoto
          ? (
            <div className="h-40 w-full overflow-hidden">
              <img
                src={group.coverPhoto}
                alt="cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: `${group.coverPosition?.x ?? 50}% ${group.coverPosition?.y ?? 50}%` }}
              />
            </div>
          )
          : <div className="h-1.5 bg-gradient-to-r from-blue-600 to-purple-500" />
        }
        <div className="p-6 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <Heading level={2} as="h1">{group.name}</Heading>
            <Text className="mt-1">{group.description}</Text>
            {group.groupHead && (
              <Text size="text-xs" color="text-blue-400" weight="font-medium" className="mt-2">
                Group Head: <span className="font-bold text-blue-300">{group.groupHead.name ?? group.groupHead}</span>
              </Text>
            )}
            {group.adminNote && (
              <div className="mt-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Text size="text-xs" color="text-yellow-400" weight="font-semibold" className="mb-0.5">Admin Note</Text>
                <Text size="text-xs" color="text-yellow-300">{group.adminNote}</Text>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={group.status} />
            {isGroupHead && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Moving…' : 'Move to Locked'}
              </Button>
            )}
            {!isGroupHead && currentMember && (
              <Button
                variant="secondary"
                size="sm"
                icon={UserMinus}
                loading={leaving}
                onClick={handleLeaveGroup}
                title={currentMember.locked ? `Locked: ${currentMember.lockReason || 'no reason'}` : 'Leave this group'}
              >
                {leaving ? 'Leaving…' : 'Leave Group'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Accepted Members ── */}
      <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-blue-900/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <Text as="span" size="text-sm" weight="font-semibold" color="text-white">Members ({acceptedMembers.length})</Text>
        </div>
        {acceptedMembers.length === 0
          ? <Text size="text-sm" color="text-gray-500" className="italic">No members yet.</Text>
          : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {acceptedMembers.map((m, i) => (
                <MemberCard key={m._id ? String(m._id) : i} m={m} showJoinActions={false} />
              ))}
            </div>
          )
        }
        {isGroupHead && group.status === 'active' && (
          <MemberRequest groupId={groupId} onMemberChange={load} />
        )}
      </div>

      {/* ── Pending Join Requests (group head only) ── */}
      {isGroupHead && pendingJoinRequests.length > 0 && (
        <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-yellow-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <Text as="span" size="text-sm" weight="font-semibold" color="text-white">
              Join Requests ({pendingJoinRequests.length})
            </Text>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {pendingJoinRequests.map((m, i) => (
              <MemberCard key={m._id ? String(m._id) : i} m={m} showJoinActions={true} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pending Invitations Sent (group head only) ── */}
      {isGroupHead && pendingInvitations.length > 0 && (
        <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-blue-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <Text as="span" size="text-sm" weight="font-semibold" color="text-white">
              Pending Invitations ({pendingInvitations.length})
            </Text>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {pendingInvitations.map((m, i) => (
              <MemberCard key={m._id ? String(m._id) : i} m={m} showJoinActions={false} />
            ))}
          </div>
        </div>
      )}

      {/* ── Rejected (group head only) ── */}
      {isGroupHead && rejectedMembers.length > 0 && (
        <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-red-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <Text as="span" size="text-sm" weight="font-semibold" color="text-white">Rejected ({rejectedMembers.length})</Text>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rejectedMembers.map((m, i) => (
              <div key={m._id ? String(m._id) : i} className="flex flex-col gap-2 rounded-xl p-3 bg-[var(--pms-bg-deep-4)] border border-red-500/20">
                <div
                  onClick={() => openProfile(m.userId?._id ?? m.userId)}
                  className="flex items-center gap-2 cursor-pointer group/member"
                  title="View member details"
                >
                  <Avatar name={m.userId?.name ?? '?'} size="md" gradient="from-red-600 to-red-400" />
                  <div className="min-w-0 flex-1">
                    <Text size="text-xs" weight="font-semibold" color="text-white" className="truncate">{m.userId?.name ?? 'Unknown'}</Text>
                    <div className="flex items-center gap-1 text-red-400 text-xs mt-0.5">
                      <AlertCircle size={10} /><span>Declined</span>
                    </div>
                    {m.reason && <Text size="text-xs" color="text-red-400/70" className="italic truncate">"{m.reason}"</Text>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Projects ── */}
      {group.status === 'active' && (
        <div className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-blue-900/40 p-6">
          {openProjectId ? (
            <ProjectDetail
              groupId={groupId}
              projectId={openProjectId}
              accessLevel={accessLevel}
              onBack={() => setOpenProjectId(null)}
            />
          ) : (
            <ProjectList groupId={groupId} accessLevel={accessLevel} onOpenProject={setOpenProjectId} />
          )}
        </div>
      )}

      {/* ── Member profile modal ── */}
      {profileModal && (
        <Modal
          isOpen={true}
          onClose={() => setProfileModal(null)}
          title="Member Details"
          size="sm"
        >
              {profileModal.loading && (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="lg" />
                </div>
              )}

              {!profileModal.loading && profileModal.error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm">
                  {profileModal.error}
                </div>
              )}

              {!profileModal.loading && profileModal.data && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={profileModal.data.name} size="xl" gradient="from-blue-600 to-purple-500" />
                    <div className="min-w-0">
                      <Text size="" weight="font-bold" color="text-white" className="truncate">{profileModal.data.name}</Text>
                      <Text size="text-xs" color="text-gray-400" className="truncate">{profileModal.data.email}</Text>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--pms-bg-inset)] rounded-xl p-3">
                      <Text size="text-[10px]" color="text-gray-500" className="uppercase tracking-wide mb-1">System Role</Text>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        profileModal.data.role === 'admin' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-blue-500/15 text-blue-300'
                      }`}>
                        <BadgeCheck size={12} /> {profileModal.data.role}
                      </span>
                    </div>
                    <div className="bg-[var(--pms-bg-inset)] rounded-xl p-3">
                      <Text size="text-[10px]" color="text-gray-500" className="uppercase tracking-wide mb-1">Role in Group</Text>
                      <Text as="span" size="text-xs" weight="font-semibold" color="text-white" className="capitalize">{profileModal.data.groupRole}</Text>
                    </div>
                  </div>

                  <div className="bg-[var(--pms-bg-inset)] rounded-xl p-3">
                    <Text size="text-[10px]" color="text-gray-500" className="uppercase tracking-wide mb-1">Employee ID</Text>
                    <Text size="text-sm" weight="font-semibold" color="text-purple-300" className="font-mono">
                      {profileModal.data.employeeId ?? 'Not assigned'}
                    </Text>
                  </div>
                </div>
              )}
        </Modal>
      )}
    </div>
  );
};

export default GroupDetail;