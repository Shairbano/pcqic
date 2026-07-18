import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/date';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { ClipboardList } from 'lucide-react';

const statusVariant = {
  completed:   'green',
  in_progress: 'blue',
  pending:     'yellow',
  accepted:    'purple',
  rejected:    'red',
};

const AdminMyTasks = () => {
  const navigate = useNavigate();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/my-tasks')
      .then(r => setTasks(r.data.tasks ?? []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading tasks…</div>;

  return (
    <div className="space-y-4">
      <div>
        <Heading level={2}>My Tasks</Heading>
        <Text>{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</Text>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={48} className="text-gray-600 mb-4" />
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-400" className="mb-2">No tasks assigned</Heading>
          <Text size="text-sm" color="text-gray-500">Tasks assigned to you will appear here.</Text>
        </div>
      ) : (
        tasks.map(t => (
          <Card
            key={t._id}
            variant="admin"
            hoverable
            onClick={() => navigate(`/groups/${t.groupId?._id ?? t.groupId}/projects/${t.projectId?._id ?? t.projectId}/tasks/${t._id}`)}
          >
          <Card.Body variant="admin">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Heading level={4} size="" weight="font-semibold">{t.title}</Heading>
                <Text size="text-xs" color="text-gray-400" className="mt-0.5">{t.projectId?.name ?? '—'} · {t.groupId?.name ?? '—'}</Text>
              </div>
              <Badge variant={statusVariant[t.status] ?? 'gray'}>
                {t.status}
              </Badge>
            </div>
            <Text size="text-xs" color="text-gray-400" className="mb-3 line-clamp-2">{t.description ?? 'No description.'}</Text>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span><span>{t.progress ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400 rounded-full" style={{ width: `${t.progress ?? 0}%` }} />
                </div>
              </div>
              {t.deadline && <Text size="text-xs" color="text-gray-400" className="whitespace-nowrap">Due {formatDate(t.deadline)}</Text>}
            </div>
          </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminMyTasks;