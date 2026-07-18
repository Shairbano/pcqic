import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/authContext';
import groupService from '../services/groupService';
import notificationService from '../services/NotificationService';
import { FolderLock, FolderOpen, Trash2, UserX, UserMinus, RotateCcw, Trash, MailPlus, MailX } from 'lucide-react';
import { formatDate } from '../utils/date';
import Heading from './ui/Heading';
import Text from './ui/Text';
import Button from './ui/Button';

const BASE_TABS = [
  { id: 'groups', label: 'Locked Groups', icon: FolderLock },
  { id: 'projects', label: 'Locked Projects', icon: FolderOpen },
  { id: 'tasks', label: 'Trash Tasks', icon: Trash2 },
  { id: 'members', label: 'Removed Members', icon: UserMinus },
];

// Trash Employees and Trash Messages are admin-only — managing employee
// accounts is purely an admin function (employees only see themselves
// getting removed *from a group*, covered by "Removed Members" above,
// not the account-level trash), and only admins have a Messages inbox.
const ADMIN_ONLY_TABS = [
  { id: 'users', label: 'Trash Employees', icon: UserX },
  { id: 'messages', label: 'Trash Messages', icon: MailX },
];

const emptyItems = { groups: [], projects: [], tasks: [], users: [], members: [], messages: [] };

const ArchivedItems = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const TABS = useMemo(
    () => (isAdmin ? [...BASE_TABS, ...ADMIN_ONLY_TABS] : BASE_TABS),
    [isAdmin]
  );
  const [activeTab, setActiveTab] = useState('groups');
  const [items, setItems] = useState(emptyItems);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState('');
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState('');
  const [requestedIds, setRequestedIds] = useState(new Set());

  const load = () => {
    setLoading(true);
    Promise.all([
      groupService.getArchived(),
      isAdmin ? notificationService.getTrashed() : Promise.resolve({ data: { notifications: [] } }),
    ])
      .then(([archivedRes, trashedNotifRes]) => setItems({
        groups: archivedRes.data.groups ?? [],
        projects: archivedRes.data.projects ?? [],
        tasks: archivedRes.data.tasks ?? [],
        users: archivedRes.data.users ?? [],
        members: archivedRes.data.members ?? [],
        messages: trashedNotifRes.data.notifications ?? [],
      }))
      .catch(() => setError('Could not load locked items.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRows = items[activeTab] ?? [];
  const activeMeta = useMemo(() => TABS.find(tab => tab.id === activeTab) ?? TABS[0], [activeTab, TABS]);

  const handleRestore = async (kind, row) => {
    const label = row.name || row.title || row.subject || row.email || row.userId?.name || 'this item';
    if (!window.confirm(`Restore "${label}"?`)) return;
    setRestoring(`${kind}:${row._id}`);
    try {
      if (kind === 'messages') {
        await notificationService.restore(row._id);
      } else {
        await groupService.restoreArchived(kind, row._id);
      }
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring('');
    }
  };

  const handlePermanentDelete = async (kind, row) => {
    const label = row.name || row.title || row.subject || row.email || row.userId?.name || 'this item';
    if (!window.confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;
    setDeleting(`${kind}:${row._id}`);
    try {
      if (kind === 'messages') {
        await notificationService.permanentlyDelete(row._id);
      } else {
        await groupService.permanentlyDeleteArchived(kind, row._id);
      }
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Permanent delete failed');
    } finally {
      setDeleting('');
    }
  };

  const handleRequestUnlock = async (row) => {
    if (!window.confirm(`Send a request to admin to unlock "${row.name}"?`)) return;
    setRequesting(row._id);
    try {
      await groupService.requestUnlock(row._id);
      setRequestedIds(prev => new Set(prev).add(row._id));
    } catch (e) {
      alert(e.response?.data?.message || 'Could not send unlock request');
    } finally {
      setRequesting('');
    }
  };

  const showActionColumn = isAdmin || activeTab === 'groups';

  if (loading) return <div className="text-purple-400 animate-pulse">Loading locked items...</div>;

  return (
    <div className="space-y-6 text-white">
      <div>
        <Heading level={2}>Locked Folder</Heading>
        <Text size="text-sm" color="text-gray-400">Deleted groups and projects are locked. Deleted tasks, employees, and messages are in trash.</Text>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
              activeTab === id
                ? 'border-purple-500 bg-purple-600/25 text-purple-200'
                : 'border-purple-900/40 bg-[var(--pms-bg-surface-alt)] text-gray-300 hover:border-purple-500/60 hover:bg-[var(--pms-bg-hover)]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon size={16} className="text-purple-400" /> {label}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{items[id]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-purple-900/40 bg-[var(--pms-bg-inset)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--pms-bg-header)] text-gray-300 uppercase text-xs">
              {headersFor(activeTab).map(header => (
                <th key={header} className="p-3 text-left">{header}</th>
              ))}
              {showActionColumn && <th className="p-3 text-left">Action</th>}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={showActionColumn ? headersFor(activeTab).length + 1 : headersFor(activeTab).length} className="p-8 text-center text-gray-500">
                  No {activeMeta.label.toLowerCase()} found.
                </td>
              </tr>
            ) : activeRows.map(row => (
              <tr key={row._id} className="border-t border-white/5 bg-[var(--pms-bg-surface-alt)] hover:bg-[var(--pms-bg-hover)] transition">
                {cellsFor(activeTab, row).map((cell, idx) => (
                  <td key={idx} className="p-3 text-gray-300">{cell}</td>
                ))}
                {isAdmin && (
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="successTint"
                        size="sm"
                        rounded="lg"
                        weight="font-semibold"
                        icon={RotateCcw}
                        iconSize={13}
                        disabled={restoring === `${activeTab}:${row._id}` || deleting === `${activeTab}:${row._id}`}
                        onClick={() => handleRestore(activeTab, row)}
                      >
                        {restoring === `${activeTab}:${row._id}` ? 'Restoring...' : 'Restore'}
                      </Button>
                      <Button
                        variant="dangerTint"
                        size="sm"
                        rounded="lg"
                        weight="font-semibold"
                        icon={Trash}
                        iconSize={13}
                        disabled={restoring === `${activeTab}:${row._id}` || deleting === `${activeTab}:${row._id}`}
                        onClick={() => handlePermanentDelete(activeTab, row)}
                        title="Permanently delete"
                      >
                        {deleting === `${activeTab}:${row._id}` ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                )}
                {!isAdmin && activeTab === 'groups' && (
                  <td className="p-3">
                    <Button
                      variant="primaryTint"
                      size="sm"
                      rounded="lg"
                      weight="font-semibold"
                      icon={MailPlus}
                      iconSize={13}
                      disabled={requesting === row._id || requestedIds.has(row._id)}
                      onClick={() => handleRequestUnlock(row)}
                    >
                      {requestedIds.has(row._id)
                        ? 'Requested'
                        : requesting === row._id
                          ? 'Sending...'
                          : 'Request Unlock'}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const headersFor = (kind) => {
  if (kind === 'projects') return ['Project', 'Group', 'Created By', 'Locked On'];
  if (kind === 'tasks') return ['Task', 'Project', 'Group', 'Assigned To', 'Moved On'];
  if (kind === 'users') return ['ID', 'Name', 'Email', 'Role', 'Moved On'];
  if (kind === 'members') return ['Member', 'Group', 'Removed By', 'Removed On'];
  if (kind === 'messages') return ['Type', 'Subject', 'From', 'Trashed On'];
  return ['Group', 'Head', 'Created By', 'Locked On'];
};

const cellsFor = (kind, row) => {
  if (kind === 'projects') {
    return [row.name, row.groupId?.name ?? '-', row.createdBy?.name ?? '-', formatDate(row.archivedAt)];
  }
  if (kind === 'tasks') {
    return [row.title, row.projectId?.name ?? '-', row.groupId?.name ?? '-', row.assignedTo?.name ?? 'Unassigned', formatDate(row.archivedAt)];
  }
  if (kind === 'users') {
    return [row.employeeId || '-', row.name, row.email, row.role, formatDate(row.archivedAt)];
  }
  if (kind === 'members') {
    return [row.userId?.name ?? 'Unknown', row.groupName ?? '-', row.removedBy?.name ?? '-', formatDate(row.removedAt)];
  }
  if (kind === 'messages') {
    return [
      row.type === 'unlock_request' ? 'Unlock Request' : 'Contact',
      row.subject || row.message || '-',
      row.senderName || '-',
      formatDate(row.archivedAt),
    ];
  }
  return [row.name, row.groupHead?.name ?? '-', row.createdBy?.name ?? '-', formatDate(row.archivedAt)];
};

export default ArchivedItems;