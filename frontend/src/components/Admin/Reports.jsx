import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/date';
import {
  User, FlaskConical, FolderOpen, ClipboardList,
  Hourglass, CheckSquare, AlertTriangle,
} from 'lucide-react';
const StatCard = ({ label, value, color, icon: Icon, onClick }) => (
  <Card
    onClick={onClick}
    className={`border-l-4 ${color} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-purple-500/60 transition-all duration-200' : ''}`}
  >
    <Card.Body>
      <Text size="text-xs" color="text-gray-400" className="uppercase tracking-wider">{label}</Text>
      <Text size="text-3xl" weight="font-bold" color="text-white" className="mt-2">{value ?? '—'}</Text>
      <div className="mt-1"><Icon size={20} className="text-gray-500" /></div>
    </Card.Body>
  </Card>
);
const statusVariant = {
  completed:   'green',
  in_progress: 'blue',
  pending:     'yellow',
  accepted:    'purple',
  rejected:    'red',
  forwarded:   'orange',
};

const Reports = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [overview,   setOverview]   = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [taskSearch, setTaskSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, tkRes] = await Promise.all([
          api.get('/admin/reports/overview'),
          api.get('/admin/reports/tasks'),
        ]);
        setOverview(ovRes.data.report);
        setTasks(tkRes.data.tasks);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
    t.assignedTo?.name?.toLowerCase().includes(taskSearch.toLowerCase()) ||
    t.projectId?.name?.toLowerCase().includes(taskSearch.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-purple-400 animate-pulse">
      Loading reports…
    </div>
  );

  const stats = overview ? [
    { label: 'Total Users',      value: overview.totalUsers,      color: 'border-blue-500',   icon: User,          onClick: () => onNavigate?.('users') },
    { label: 'Active Groups',    value: overview.totalGroups,     color: 'border-purple-500', icon: FlaskConical,  onClick: () => onNavigate?.('groups') },
    { label: 'Active Projects',  value: overview.totalProjects,   color: 'border-indigo-500', icon: FolderOpen,    onClick: () => onNavigate?.('projects') },
    { label: 'Total Tasks',      value: overview.totalTasks,      color: 'border-cyan-500',   icon: ClipboardList, onClick: () => onNavigate?.('my-tasks') },
    { label: 'Pending Groups',   value: overview.pendingGroups,   color: 'border-yellow-400', icon: Hourglass,     onClick: () => onNavigate?.('group-approvals') },
    { label: 'Pending Projects', value: overview.pendingProjects, color: 'border-orange-400', icon: Hourglass,     onClick: () => onNavigate?.('projects') },
    { label: 'Completed Tasks',  value: overview.completedTasks,  color: 'border-green-500',  icon: CheckSquare,   onClick: () => onNavigate?.('my-tasks') },
    { label: 'Overdue Tasks',    value: overview.overdueTasks,    color: 'border-red-500',    icon: AlertTriangle, onClick: () => onNavigate?.('my-tasks') },
  ] : [];
  return (
    <div className="space-y-8">
      <div>
        <Heading level={2} className="mb-1">System Overview</Heading>
        <Text>Real-time metrics across the platform</Text>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Task Report Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>All Tasks</Heading>
          <Input
            value={taskSearch}
            onChange={e => setTaskSearch(e.target.value)}
            placeholder="Search by task, user or project…"
            className="w-64"
          />
        </div>

        <Table>
          <Table.Head>
            <Table.Th>Task</Table.Th>
            <Table.Th>Project</Table.Th>
            <Table.Th>Assigned To</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Progress</Table.Th>
            <Table.Th>Deadline</Table.Th>
          </Table.Head>
          <Table.Body>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No tasks found</td></tr>
            )}
            {filtered.map(t => (
              <tr
                key={t._id}
                onClick={() => navigate(`/groups/${t.groupId?._id ?? t.groupId}/projects/${t.projectId?._id ?? t.projectId}/tasks/${t._id}`)}
                className="border-t border-white/5 hover:bg-purple-500/10 hover:shadow-md transition-colors duration-150 bg-[var(--pms-bg-surface-alt)] cursor-pointer"
              >
                <Table.Td className="text-white font-medium">{t.title}</Table.Td>
                <Table.Td className="text-gray-400">{t.projectId?.name ?? '—'}</Table.Td>
                <Table.Td className="text-gray-300">{t.assignedTo?.name ?? 'Unassigned'}</Table.Td>
                <Table.Td>
                  <Badge variant={statusVariant[t.status] ?? 'gray'}>
                    {t.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${t.progress ?? 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{t.progress ?? 0}%</span>
                  </div>
                </Table.Td>
                <Table.Td className="text-gray-400 text-xs">
                  {t.deadline ? formatDate(t.deadline) : '—'}
                </Table.Td>
              </tr>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
};

export default Reports;