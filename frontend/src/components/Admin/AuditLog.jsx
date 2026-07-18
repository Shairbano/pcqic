import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/date';

const actionColor = {
  admin_delete_user:    'text-red-400',
  admin_update_role:    'text-yellow-400',
  admin_reset_password: 'text-orange-400',
  admin_approve_group:  'text-green-400',
  admin_reject_group:   'text-red-400',
  admin_approve_project:'text-green-400',
  admin_reject_project: 'text-red-400',
  invite_member:        'text-indigo-400',
  task_accept:          'text-green-400',
  task_reject:          'text-red-400',
  task_forward:         'text-yellow-400',
  task_update:          'text-blue-400',
};

const levelColor = {
  info:  'text-blue-400',
  warn:  'text-yellow-400',
  error: 'text-red-400',
};

const typeColor = {
  login:              'text-green-400',
  logout:             'text-gray-400',
  failed_login:       'text-red-400',
  api_error:          'text-orange-400',
  validation_error:   'text-yellow-400',
  file_upload_error:  'text-orange-400',
  server_error:       'text-red-500',
  database_error:     'text-red-500',
  permission_denied:  'text-pink-400',
  exception:          'text-red-500',
  // Creation events — moved here from the Management Log (see TechnicalLog.js)
  create_user:        'text-blue-400',
  create_group:       'text-purple-400',
  create_project:     'text-indigo-400',
  create_task:        'text-cyan-400',
  create_guide:       'text-teal-400',
};

// Two tabs, two completely separate collections/endpoints — Feature #4:
//  - Management Log  → AuditLog model / GET /admin/audit-log   (business actions: who did what)
//  - Technical Log    → TechnicalLog model / GET /admin/technical-log (system events: logins, errors, stack traces)
const TABS = [
  { id: 'management', label: 'Management Log' },
  { id: 'technical',  label: 'Technical Log'  },
];

const AuditLog = () => {
  const [tab,     setTab]     = useState('management');
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expanded, setExpanded] = useState(null); // technical-log row id showing full stack trace

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Whenever the (debounced) search or tab changes, jump back to page 1.
  // Done during render (not inside a useEffect body) per React's
  // "adjusting state when a prop/value changes" pattern — avoids the
  // extra render pass a setState-in-effect would cause.
  const [prevFilterKey, setPrevFilterKey] = useState(`${tab}::${debouncedSearch}`);
  const filterKey = `${tab}::${debouncedSearch}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = tab === 'management' ? '/admin/audit-log' : '/admin/technical-log';
        const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
        const res = await api.get(`${endpoint}?page=${page}&limit=20${searchParam}`);
        if (!cancelled) {
          setLogs(res.data.logs ?? []);
          setPages(res.data.pages ?? 1);
          setTotal(res.data.total ?? 0);
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [tab, page, debouncedSearch]);

  const switchTab = (id) => { setTab(id); setPage(1); setSearch(''); setDebouncedSearch(''); setExpanded(null); };

  const [clearing, setClearing] = useState(false);
  const handleClearLog = async () => {
    const label = tab === 'management' ? 'Management Log' : 'Technical Log';
    if (!window.confirm(`Permanently delete all ${total} entries in the ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const endpoint = tab === 'management' ? '/admin/audit-log' : '/admin/technical-log';
      await api.delete(endpoint);
      setPage(1);
      setLogs([]);
      setTotal(0);
      setPages(1);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to clear log');
    } finally {
      setClearing(false);
    }
  };

  // The server already filters by `search` across all records/columns, so just render what came back.
  const filtered = logs;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <Heading level={2}>{tab === 'management' ? 'Management Log' : 'Technical Log'}</Heading>
          <Text size="text-sm" color="text-gray-400">{total} total entries</Text>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'management' ? 'Filter by action, user, or detail…' : 'Filter by type, user, endpoint, or message…'}
            className="w-72"
          />
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            loading={clearing}
            disabled={total === 0}
            onClick={handleClearLog}
          >
            {clearing ? 'Clearing…' : 'Empty Log'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-purple-900/30">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px cursor-pointer ${
              tab === t.id ? 'border-purple-500 text-purple-300' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-purple-400 animate-pulse py-12">Loading {tab === 'management' ? 'management' : 'technical'} log…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-purple-900/30 shadow-sm">
            {tab === 'management' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--pms-bg-header)] text-gray-400 uppercase text-xs">
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Actor</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Target</th>
                    <th className="p-3 text-left">Detail</th>
                    <th className="p-3 text-left">Changed</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No logs found</td></tr>
                  )}
                  {filtered.map(l => (
                    <tr key={l._id} className="border-t border-white/5 hover:bg-white/3 transition bg-[var(--pms-bg-surface-alt)]">
                      <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(l.createdAt)}</td>
                      <td className="p-3">
                        <Text size="text-xs" weight="font-medium" color="text-white">{l.actorId?.name ?? '—'}</Text>
                        <Text size="text-xs" color="text-gray-500">{l.actorId?.email}</Text>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-mono font-semibold ${actionColor[l.action] ?? 'text-gray-400'}`}>{l.action}</span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">
                        {l.targetType && <span className="text-indigo-400 font-medium">{l.targetType}</span>}
                      </td>
                      <td className="p-3 text-xs text-gray-400 max-w-xs truncate" title={l.detail}>{l.detail ?? '—'}</td>
                      <td className="p-3 text-xs">
                        {(l.beforeValue !== undefined && l.beforeValue !== null) || (l.afterValue !== undefined && l.afterValue !== null) ? (
                          <span
                            className="text-purple-400 cursor-help"
                            title={`Before: ${JSON.stringify(l.beforeValue)}\nAfter: ${JSON.stringify(l.afterValue)}`}
                          >
                            view diff
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--pms-bg-header)] text-gray-400 uppercase text-xs">
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Endpoint</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No logs found</td></tr>
                  )}
                  {filtered.map(l => (
                    <>
                      <tr
                        key={l._id}
                        onClick={() => l.stack && setExpanded(expanded === l._id ? null : l._id)}
                        className={`border-t border-white/5 hover:bg-white/3 transition bg-[var(--pms-bg-surface-alt)] ${l.stack ? 'cursor-pointer' : ''}`}
                      >
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(l.createdAt)}</td>
                        <td className="p-3">
                          <Text size="text-xs" weight="font-medium" color="text-white">{l.userId?.name ?? '—'}</Text>
                          <Text size="text-xs" color="text-gray-500">{l.userId?.email}</Text>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs font-mono font-semibold ${typeColor[l.type] ?? 'text-gray-400'}`}>{l.type}</span>
                          <span className={`ml-2 text-[10px] uppercase font-bold ${levelColor[l.level] ?? 'text-gray-500'}`}>{l.level}</span>
                        </td>
                        <td className="p-3 text-xs text-gray-400 max-w-[220px] truncate" title={l.endpoint}>
                          {l.method && <span className="text-cyan-400 mr-1">{l.method}</span>}{l.endpoint}
                        </td>
                        <td className="p-3 text-xs text-gray-400">{l.statusCode ?? '—'}</td>
                        <td className="p-3 text-xs text-gray-400 max-w-xs truncate" title={l.message}>{l.message ?? '—'}</td>
                      </tr>
                      {expanded === l._id && l.stack && (
                        <tr className="bg-[var(--pms-bg-inset)]">
                          <td colSpan={6} className="p-3">
                            <pre className="text-[11px] text-red-300 whitespace-pre-wrap max-h-64 overflow-y-auto">{l.stack}</pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <Text size="" color="text-gray-500">Page {page} of {pages}</Text>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLog;