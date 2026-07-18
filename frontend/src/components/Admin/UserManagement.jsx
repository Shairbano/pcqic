import { useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Plus, Copy, Printer, Download, CheckCircle2, KeyRound } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/authContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Model';
import Table from '../ui/Table';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import ErrorBanner from '../ui/ErrorBanner';
import { formatDate } from '../../utils/date';

const ROLES = ['admin', 'employee'];
const initialForm = { name: '', email: '', password: '', role: 'employee' };

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formErr, setFormErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Feature #1 — one-time credentials screen shown right after creating a
  // user. Populated only from the createUser response; never re-fetched,
  // never persisted client-side beyond this session's component state.
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewingId, setViewingId] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await api.get('/admin/users');
        if (isMounted) {
          setUsers(res.data.users);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.employeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  const closeCreate = () => {
    setShowCreate(false);
    setForm(initialForm);
    setFormErr('');
    setShowCreatePassword(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Create user "${form.name}" (${form.email}) and email them their login credentials?`)) {
      return;
    }
    setFormErr('');
    setSubmitting(true);
    try {
      const res = await api.post('/admin/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      closeCreate();
      load();
      // Feature #1 — show the one-time credentials screen. loginUrl is built
      // from the current origin so it's correct regardless of environment.
      setCredentials({
        name: form.name,
        email: res.data.credentials?.email ?? form.email,
        tempPassword: res.data.credentials?.tempPassword ?? form.password,
        employeeId: res.data.user?.employeeId ?? '',
        loginUrl: `${window.location.origin}/login`,
        mode: 'created',
      });
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const closeCredentials = () => { setCredentials(null); setCopied(false); };

  const credentialsText = () => credentials ? [
    'PMS — New Account Credentials',
    '',
    `Name:          ${credentials.name}`,
    `Employee ID:   ${credentials.employeeId}`,
    `Email:         ${credentials.email}`,
    `Temp Password: ${credentials.tempPassword ?? '(not viewable — already set; use Reset PW to issue a new one)'}`,
    `Login URL:     ${credentials.loginUrl}`,
    '',
    'This password must be changed on first login.',
  ].join('\n') : '';

  const handleCopyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handlePrintCredentials = () => {
    const w = window.open('', '_blank', 'width=480,height=360');
    if (!w) return;
    w.document.write(`<pre style="font-family:monospace;font-size:14px;white-space:pre-wrap;padding:24px;">${credentialsText().replace(/</g, '&lt;')}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadCredentials = () => {
    const blob = new Blob([credentialsText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${credentials.employeeId || credentials.email}-credentials.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!confirm(`Move employee "${name}" to trash?`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (e) {
      alert(e.response?.data?.message || 'Move to trash failed');
    }
  };

  const handleViewCredentials = async (u) => {
    setViewingId(u._id);
    try {
      const res = await api.get(`/admin/users/${u._id}/credentials`);
      const c = res.data.credentials;
      setCredentials({
        name: c.name,
        email: c.email,
        employeeId: c.employeeId,
        // The original temp password can never be recovered once hashed —
        // only the access token is still retrievable here.
        tempPassword: null,
        loginUrl: `${window.location.origin}/login`,
        mode: 'viewed',
      });
    } catch (e) {
      alert(e.response?.data?.message || 'Could not load credentials');
    } finally {
      setViewingId('');
    }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 4) return alert('Password too short');
    setResetting(true);
    try {
      const res = await api.patch(`/admin/users/${resetTarget._id}/reset-password`, { password: newPass });
      const target = resetTarget;
      setResetTarget(null);
      setNewPass('');
      setShowResetPassword(false);
      // Same one-time credentials screen as creation — this reset just
      // issued a brand-new password and access token, so show them once here.
      setCredentials({
        name: target.name,
        email: res.data.credentials?.email ?? target.email,
        tempPassword: res.data.credentials?.tempPassword ?? newPass,
        employeeId: target.employeeId ?? '',
        loginUrl: `${window.location.origin}/login`,
        mode: 'reset',
      });
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <Heading level={2}>User Management</Heading>
          <Text>{users.length} total users</Text>
        </div>
        <div className="flex gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-56"
          />
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            New User
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-purple-400 animate-pulse py-12">Loading users...</div>
      ) : (
        <Table>
          <Table.Head>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Head>
          <Table.Body>
            {filtered.map((u) => {
              const isCurrentAdmin = currentUser?.id === u._id && u.role === 'admin';
              return (
                <Table.Row key={u._id}>
                  <Table.Td className="text-purple-300 font-mono text-xs">{u.employeeId || '-'}</Table.Td>
                  <Table.Td className="font-medium text-white">{u.name}</Table.Td>
                  <Table.Td className="text-gray-400">{u.email}</Table.Td>
                  <Table.Td>
                    <select
                      value={u.role}
                      disabled={isCurrentAdmin}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isCurrentAdmin ? 'Admins cannot change their own role to employee' : 'Change user role'}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Table.Td>
                  <Table.Td className="text-gray-500 text-xs">{formatDate(u.createdAt)}</Table.Td>
                  <Table.Td>
                    <div className="flex flex-wrap items-center gap-2">
                    {u.mustChangePassword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={KeyRound}
                        loading={viewingId === u._id}
                        onClick={() => handleViewCredentials(u)}
                        title="View this user's still-pending access token"
                      >
                        {viewingId === u._id ? '...' : 'View'}
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setResetTarget(u)}>
                      Reset PW
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u._id, u.name)}>
                      Trash
                    </Button>
                    </div>
                  </Table.Td>
                </Table.Row>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users found</td></tr>
            )}
          </Table.Body>
        </Table>
      )}

      <Modal isOpen={showCreate} onClose={closeCreate} title="Create New User" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <ErrorBanner message={formErr} />
          <Input
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full Name"
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
          />

          <Input
            label="Password"
            type={showCreatePassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Temporary password"
            rightElement={
              <Button
                variant="bare"
                size="none"
                rounded="none"
                weight="font-normal"
                iconSize={18}
                icon={showCreatePassword ? EyeOff : Eye}
                onClick={() => setShowCreatePassword((v) => !v)}
                className="text-gray-500 hover:text-white"
                aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
              />
            }
          />

          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>

          <Text variant="muted">
            A unique ID is assigned automatically and sent with the credentials email.
          </Text>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={closeCreate}>Cancel</Button>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {resetTarget && (
        <Modal
          isOpen={true}
          onClose={() => { setResetTarget(null); setNewPass(''); setShowResetPassword(false); }}
          title="Reset Password"
          size="sm"
        >
          <Text className="mb-4">
            Setting new password for <span className="text-purple-400 font-semibold">{resetTarget.name}</span>
          </Text>
          <Input
            type={showResetPassword ? 'text' : 'password'}
            placeholder="New password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            rightElement={
              <Button
                variant="bare"
                size="none"
                rounded="none"
                weight="font-normal"
                iconSize={18}
                icon={showResetPassword ? EyeOff : Eye}
                onClick={() => setShowResetPassword((v) => !v)}
                className="text-gray-500 hover:text-white"
                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
              />
            }
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              disabled={resetting}
              onClick={() => { setResetTarget(null); setNewPass(''); setShowResetPassword(false); }}
            >
              Cancel
            </Button>
            <Button
              variant="warningSolid"
              loading={resetting}
              onClick={handleResetPassword}
            >
              {resetting ? 'Resetting…' : 'Reset'}
            </Button>
          </div>
        </Modal>
      )}
      <Modal
        isOpen={!!credentials}
        onClose={closeCredentials}
        title={
          credentials?.mode === 'reset' ? 'Password Reset — Credentials'
            : credentials?.mode === 'viewed' ? 'Pending User — Details'
            : 'User Created — Credentials'
        }
        size="md"
      >
        {credentials && (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
              {credentials.mode === 'viewed'
                ? 'This user has not logged in yet. Their original temp password can no longer be viewed — use Reset PW to issue a new one.'
                : 'This is the only time these credentials will be shown. Save or share them now — once the user changes their password on first login, they can no longer be viewed here.'}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><Text as="dt" size="" color="text-gray-400">Name</Text><Text as="dd" size="" weight="font-medium" color="text-white" className="text-right">{credentials.name}</Text></div>
              <div className="flex justify-between gap-4"><Text as="dt" size="" color="text-gray-400">Employee ID</Text><Text as="dd" size="" weight="font-medium" color="text-purple-300" className="font-mono text-right">{credentials.employeeId}</Text></div>
              <div className="flex justify-between gap-4"><Text as="dt" size="" color="text-gray-400">Email</Text><Text as="dd" size="" weight="font-medium" color="text-white" className="text-right break-all">{credentials.email}</Text></div>
              <div className="flex justify-between gap-4"><Text as="dt" size="" color="text-gray-400">Temp Password</Text><Text as="dd" size="" weight="font-medium" color="text-white" className="font-mono text-right">{credentials.tempPassword ?? <span className="text-gray-500 italic font-sans text-xs">not viewable — use Reset PW</span>}</Text></div>
              <div className="flex justify-between gap-4"><Text as="dt" size="" color="text-gray-400">Login URL</Text><Text as="dd" size="" weight="font-medium" color="text-blue-300" className="text-right break-all">{credentials.loginUrl}</Text></div>
            </dl>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={handleCopyCredentials} className="flex-1 flex items-center justify-center gap-2">
                {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="ghost" onClick={handlePrintCredentials} className="flex-1 flex items-center justify-center gap-2">
                <Printer size={16} /> Print
              </Button>
              <Button variant="ghost" onClick={handleDownloadCredentials} className="flex-1 flex items-center justify-center gap-2">
                <Download size={16} /> Download
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={closeCredentials}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;