import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import notificationService from '../../services/NotificationService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Modal from '../ui/Model';
import { Mail, CheckCheck, Search, Trash2, Trash, LockOpen } from 'lucide-react';
import { formatDate } from '../../utils/date';

const MESSAGE_TYPES = ['admin_contact', 'unlock_request'];

const AdminMessages = ({ onReadStateChange }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [unlockingId, setUnlockingId] = useState('');

  const load = () => {
    setLoading(true);
    notificationService.getAll()
      .then(res => {
        const items = (res.data.notifications ?? []).filter(n => MESSAGE_TYPES.includes(n.type));
        setMessages(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const markRead = async (id) => {
    await notificationService.markRead(id);
    setMessages(prev => prev.map(msg => msg._id === id ? { ...msg, read: true } : msg));
    onReadStateChange?.(prev => Math.max(0, prev - 1));
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    if (!msg.read) await markRead(msg._id);
  };

  // Soft-delete — moves the message to Trash (see the "Locked" page's
  // Trash Messages tab), it is not permanently removed here.
  const deleteMessage = async (id, e, { skipConfirm = false } = {}) => {
    e?.stopPropagation();
    if (!skipConfirm && !window.confirm('Move this message to trash?')) return;
    setDeletingId(id);
    try {
      await notificationService.remove(id);
      setMessages(prev => prev.filter(msg => msg._id !== id));
      setSelected(prev => (prev?._id === id ? null : prev));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not move message to trash');
    } finally {
      setDeletingId('');
    }
  };

  const deleteAllMessages = async () => {
    if (messages.length === 0) return;
    if (!window.confirm(`Move all ${messages.length} message${messages.length !== 1 ? 's' : ''} to trash?`)) return;
    setDeletingAll(true);
    try {
      await notificationService.removeAll({ types: MESSAGE_TYPES });
      setMessages([]);
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not move messages to trash');
    } finally {
      setDeletingAll(false);
    }
  };

  const unlockGroup = async (msg, e) => {
    e?.stopPropagation();
    if (!msg.contextId) return;
    if (!window.confirm('Unlock this group and make it active again?')) return;
    setUnlockingId(msg._id);
    try {
      await api.patch(`/group/archived/groups/${msg.contextId}/restore`);
      // Resolved, but kept visible (just marked read) instead of auto-trashed —
      // you can still delete it manually via the Trash icon if you want it gone.
      if (!msg.read) await markRead(msg._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not unlock group');
    } finally {
      setUnlockingId('');
    }
  };

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(msg => {
      const haystack = [
        msg.subject, msg.message, msg.body, msg.senderName, msg.senderEmail,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [messages, search]);

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading messages...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Heading level={2}>Admin Messages</Heading>
          <Text size="text-sm" color="text-gray-400">{messages.length} message{messages.length !== 1 ? 's' : ''}</Text>
        </div>

        <div className="flex items-center gap-3">
          <Input
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-56"
          />
          {messages.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash}
              loading={deletingAll}
              onClick={deleteAllMessages}
            >
              {deletingAll ? 'Moving...' : 'Delete All'}
            </Button>
          )}
        </div>
      </div>

      <Text size="text-xs" color="text-gray-500" className="-mt-3">
        Deleted messages move to Trash — find them on the "Locked" page under "Trash Messages".
      </Text>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mail size={46} className="text-gray-600 mb-4" />
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-300">No messages yet</Heading>
          <Text size="text-sm" color="text-gray-500">Messages from Contact Admin and group unlock requests will appear here.</Text>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={40} className="text-gray-600 mb-4" />
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-300">No messages match your search</Heading>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-purple-900/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--pms-bg-header)] text-gray-400 uppercase text-xs">
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Subject</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map(msg => (
                <tr
                  key={msg._id}
                  onClick={() => openMessage(msg)}
                  className={`border-t border-white/5 hover:bg-[var(--pms-bg-hover)] cursor-pointer transition ${
                    msg.read ? 'bg-[var(--pms-bg-surface-alt)]' : 'bg-purple-500/10'
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {!msg.read && (
                        <span className="h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" title="Unread" />
                      )}
                      <Badge variant={msg.type === 'unlock_request' ? 'orange' : 'blue'}>
                        {msg.type === 'unlock_request' ? 'Unlock Request' : 'Contact'}
                      </Badge>
                    </div>
                  </td>
                  <td className={`p-3 max-w-xs truncate ${msg.read ? 'text-gray-200 font-normal' : 'text-white font-semibold'}`}>
                    {msg.subject || msg.message || 'Contact request'}
                  </td>
                  <td className={`p-3 max-w-md truncate ${msg.read ? 'text-gray-200 font-normal' : 'text-white font-semibold'}`}>
                    {msg.body ? msg.body : msg.message}
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{formatDate(msg.createdAt)}</td>
                  <td className="p-3 text-xs">
                    <span className={msg.read ? 'text-gray-500' : 'text-yellow-400 font-bold'}>
                      {msg.read ? 'read' : 'unread'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {!msg.read && (
                        <Button variant="secondary" size="sm" icon={CheckCheck}
                          onClick={(e) => { e.stopPropagation(); markRead(msg._id); }}>
                          Mark Read
                        </Button>
                      )}
                      {msg.type === 'unlock_request' && msg.contextId && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={LockOpen}
                          loading={unlockingId === msg._id}
                          onClick={(e) => unlockGroup(msg, e)}
                        >
                          {unlockingId === msg._id ? 'Unlocking...' : 'Unlock Group'}
                        </Button>
                      )}
                      <Button
                        variant="dangerTint"
                        size="none"
                        rounded="lg"
                        onClick={(e) => deleteMessage(msg._id, e)}
                        disabled={deletingId === msg._id}
                        title="Move to trash"
                        className="h-8 w-8"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal
          isOpen={true}
          onClose={() => setSelected(null)}
          title="Message Details"
          subtitle={<Text size="text-xs" color="text-gray-400">{selected.subject || 'Contact Admin Request'}</Text>}
          size="lg"
        >
          <div className="space-y-3 text-sm">
            {selected.senderName && (
              <Text size="text-sm" color="text-gray-300">
                <span className="font-semibold">From:</span> {selected.senderName} &lt;{selected.senderEmail}&gt;
              </Text>
            )}
            <Text size="text-xs" color="text-gray-400">{formatDate(selected.createdAt)}</Text>
            <div className="flex flex-wrap items-center gap-2">
              {selected.senderEmail && (
                <a
                  href={`mailto:${selected.senderEmail}?subject=${encodeURIComponent(`Re: ${selected.subject || 'Your message'}`)}`}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition rounded-lg text-white"
                >
                  Reply by email
                </a>
              )}
              {selected.type === 'unlock_request' && selected.contextId && (
                <Button
                  variant="success"
                  size="sm"
                  icon={LockOpen}
                  loading={unlockingId === selected._id}
                  onClick={() => unlockGroup(selected)}
                >
                  {unlockingId === selected._id ? 'Unlocking...' : 'Unlock Group'}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={deletingId === selected._id}
                onClick={() => deleteMessage(selected._id)}
              >
                Delete
              </Button>
            </div>
            <div className="rounded-xl bg-[var(--pms-bg-inset)] border border-white/10 p-4">
              <Text size="text-sm" color="text-gray-200" className="whitespace-pre-wrap">{selected.body || selected.message}</Text>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminMessages;