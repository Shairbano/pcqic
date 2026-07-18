import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/authContext';
import GroupDetail from '../Groups/GroupDetail';
import GroupCard from '../Groups/GroupCard';
import CreateGroupModal from '../Groups/CreateGroupModel';
import IconLink from '../ui/IconLink';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toast from '../ui/Toast';
import { Plus, Trash2, FlaskConical, ArrowLeft, Shield } from 'lucide-react';

const AdminGroups = () => {
  const { user } = useAuth();
  const [groups,        setGroups]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [showCreate,    setShowCreate]    = useState(false);
  const [deleting,      setDeleting]      = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupHasNestedProject, setGroupHasNestedProject] = useState(false);
  const [toast,         setToast]         = useState({ msg: '', type: 'ok' });

  const showToast = (msg, type = 'ok') => setToast({ msg, type });

  const fetchGroups = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/groups?status=active', { signal });
      setGroups(res.data.groups ?? []);
    } catch (e) {
      if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await fetchGroups(controller.signal);
    })();
    return () => controller.abort();
  }, [fetchGroups]);

  const reload = useCallback(() => fetchGroups(), [fetchGroups]);

  const handleDelete = async (group) => {
    if (!window.confirm(`Move group "${group.name}" to the locked folder?`)) return;
    setDeleting(group._id);
    try {
      await api.delete(`/group/${group._id}`);
      setGroups(prev => prev.filter(g => g._id !== group._id));
      showToast('Group moved to locked folder.');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to lock group', 'err');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const myId = user?.id?.toString();

  const isHeadOrCreator = (g) => {
    const headId = g.groupHead?._id?.toString() ?? g.groupHead?.toString();
    const creatorId = g.createdBy?._id?.toString() ?? g.createdBy?.toString();
    return headId === myId || creatorId === myId;
  };
  const isAcceptedMember = (g) => (g.members || []).some(m => {
    const memberId = (m.userId?._id ?? m.userId)?.toString();
    return memberId === myId && m.status === 'accepted';
  });

  const groupsIHead        = filtered.filter(g => isHeadOrCreator(g));
  const groupsIAmMemberOf  = filtered.filter(g => !isHeadOrCreator(g) && isAcceptedMember(g));
  const otherGroups        = filtered.filter(g => !isHeadOrCreator(g) && !isAcceptedMember(g));

  return (
    <div className="space-y-6">
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'ok' })} />

      {selectedGroup && (
        <div>
          {!groupHasNestedProject && (
            <IconLink
              icon={ArrowLeft}
              onClick={() => { setSelectedGroup(null); setGroupHasNestedProject(false); }}
              className="mb-6"
            >
              Back to Manage Groups
            </IconLink>
          )}
          <GroupDetail
            groupId={selectedGroup}
            onDeleted={() => { setSelectedGroup(null); setGroupHasNestedProject(false); reload(); }}
            onNestedChange={setGroupHasNestedProject}
          />
        </div>
      )}

      {!selectedGroup && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Heading level={2} size="text-2xl" color="text-purple-300">Manage Groups</Heading>
              <Text>
                {groups.length} active group{groups.length !== 1 ? 's' : ''}
              </Text>
            </div>
            <div className="flex gap-3">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search groups…"
                className="w-56"
              />
              <Button icon={Plus} onClick={() => setShowCreate(true)}>
                New Group
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <Shield size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <Text size="text-xs" color="text-blue-300" className="leading-relaxed">
              Groups you create here are immediately active. Groups created by employees need your approval.
              You can only delete any group as system admin, but you do not automatically control groups
              created by others — you must join them as a normal member to participate.
            </Text>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-[var(--pms-bg-surface)]/40 rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical size={48} className="text-gray-600 mb-4" />
              <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-300" className="mb-2">
                {search ? 'No groups match your search' : 'No active groups yet'}
              </Heading>
              {!search && (
                <Button onClick={() => setShowCreate(true)} className="mt-4">
                  Create Group
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Groups You Head */}
              {groupsIHead.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <Heading level={3}>Groups You Head ({groupsIHead.length})</Heading>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupsIHead.map((g, idx) => (
                      <GroupCard
                        key={g._id}
                        group={g}
                        index={idx}
                        onClick={() => { setSelectedGroup(g._id); setGroupHasNestedProject(false); }}
                        badge={
                          <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                            Active
                          </span>
                        }
                        footer={
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            loading={deleting === g._id}
                            onClick={e => { e.stopPropagation(); handleDelete(g); }}
                            className="w-full justify-center"
                          >
                            {deleting === g._id ? 'Moving…' : 'Move to Locked'}
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Groups You're a Member Of */}
              {groupsIAmMemberOf.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    <Heading level={3}>Groups You're Member Of ({groupsIAmMemberOf.length})</Heading>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupsIAmMemberOf.map((g, idx) => (
                      <GroupCard
                        key={g._id}
                        group={g}
                        index={idx}
                        onClick={() => { setSelectedGroup(g._id); setGroupHasNestedProject(false); }}
                        badge={
                          <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                            Active
                          </span>
                        }
                        footer={
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            loading={deleting === g._id}
                            onClick={e => { e.stopPropagation(); handleDelete(g); }}
                            className="w-full justify-center"
                          >
                            {deleting === g._id ? 'Moving…' : 'Move to Locked'}
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Others — groups you neither head nor belong to, but can still moderate as admin */}
              {otherGroups.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    <Heading level={3}>Others ({otherGroups.length})</Heading>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {otherGroups.map((g, idx) => (
                      <GroupCard
                        key={g._id}
                        group={g}
                        index={idx}
                        onClick={() => { setSelectedGroup(g._id); setGroupHasNestedProject(false); }}
                        badge={
                          <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                            Active
                          </span>
                        }
                        footer={
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            loading={deleting === g._id}
                            onClick={e => { e.stopPropagation(); handleDelete(g); }}
                            className="w-full justify-center"
                          >
                            {deleting === g._id ? 'Moving…' : 'Move to Locked'}
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <CreateGroupModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onSuccess={reload}
            subtitle={<Text size="text-xs" color="text-green-400">✓ Admin-created groups are immediately active</Text>}
          />
        </>
      )}
    </div>
  );
};

export default AdminGroups;