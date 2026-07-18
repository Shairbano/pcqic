import { formatDate as formatDateOnly } from '../../utils/date';
import Text from '../ui/Text';

const actionColors = {
  created:   'bg-blue-500',
  accepted:  'bg-green-500',
  rejected:  'bg-red-500',
  forwarded: 'bg-yellow-500',
  updated:   'bg-purple-500',
  completed: 'bg-teal-500',
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return formatDateOnly(val, 'â€”');
};

const getActorName = (ev) => {
  // history.actorId is populated by backend as { name, email }
  if (ev.actor?.name) return ev.actor.name;
  if (ev.actorId?.name) return ev.actorId.name;
  if (typeof ev.actorId === 'string' && ev.actorId.length > 0) return ev.actorId;
  return 'Unknown';
};

const TaskTimeline = ({ events = [] }) => {
  if (!events.length) {
    return <Text size="text-sm" color="text-gray-500" className="italic">No activity yet.</Text>;
  }

  return (
    <ol className="relative border-l border-white/10 space-y-6 pl-6">
      {events.map((ev, idx) => {
        const dot = actionColors[ev.action?.toLowerCase()] ?? 'bg-gray-500';
        const actorName = getActorName(ev);
        const timestamp = formatDate(ev.timestamp ?? ev.createdAt);

        return (
          <li key={ev._id ?? idx} className="relative">
            <span className={`absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-[var(--pms-bg-void)] ${dot}`} />
            <div className="bg-[var(--pms-bg-surface-alt)] rounded-xl border border-white/8 p-4">
              <div className="flex items-center justify-between mb-1">
                <Text as="span" size="text-sm" weight="font-semibold" color="text-white" className="capitalize">{ev.action}</Text>
                <Text as="span" size="text-xs" color="text-gray-500">{timestamp}</Text>
              </div>
              <Text size="text-xs" color="text-gray-400">
                by <span className="text-blue-300 font-medium">{actorName}</span>
              </Text>
              {ev.note && (
                <Text size="text-xs" color="text-gray-400" className="mt-2 italic border-l-2 border-blue-500/40 pl-3">
                  "{ev.note}"
                </Text>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default TaskTimeline;