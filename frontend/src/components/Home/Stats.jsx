import { useCallback } from 'react';
import { Users, Layers, FolderOpen, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import useCancellableFetch from '../../hooks/useCancellableFetch';
import Card from '../ui/Card';
import Heading from '../ui/Heading';

const stats = [
  { key: 'totalUsers', title: 'Registered Users', icon: Users, color: 'text-blue-400' },
  { key: 'activeGroups', title: 'Active Groups', icon: Layers, color: 'text-purple-400' },
  { key: 'activeProjects', title: 'Active Projects', icon: FolderOpen, color: 'text-pink-400' },
  { key: 'pendingGroups', title: 'Pending Groups', icon: Clock, color: 'text-cyan-400' },
  { key: 'adminUsers', title: 'Active Admins', icon: ShieldCheck, color: 'text-green-400' },
  { key: 'groupsWithMembers', title: 'Groups Members', icon: UserCheck, color: 'text-yellow-400' },
];

const Stats = () => {
  const fetchOverview = useCallback(
    () => api.get('/public/overview').then((res) => res.data.overview ?? {}),
    []
  );
  
  const { data, loading } = useCancellableFetch(fetchOverview, [], {
    initialData: {},
    resetOnError: true,
  });

  return (
    <section className="max-w-6xl mx-auto my-16 px-4 cursor-pointer">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {stats.map(({ key, title, icon: Icon, color }) => (
          <Card
            key={key}
            variant="stat"
            hoverable
            className="group shadow-xl"
          >
            <Card.Body variant="stat">
              <div className="mb-6 p-4 rounded-2xl bg-[var(--pms-bg-header)] group-hover:bg-[var(--pms-border)] transition-colors shadow-inner">
                <Icon className={`w-8 h-8 ${color}`} />
              </div>
              <Heading className="text-gray-400 font-semibold mb-2 uppercase tracking-widest text-xs text-center">
                {title}
              </Heading>
              <span className="text-4xl font-black text-white">
                {loading ? (
                  <span className="inline-block h-8 w-12 bg-white/10 rounded-lg animate-pulse" />
                ) : (
                  data[key] ?? 0
                )}
              </span>
            </Card.Body>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Stats;