import { useNavigate } from 'react-router-dom';
import { Trash2, Lock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Button from '../ui/Button';
import { formatDate } from '../../utils/date';

const TaskCard = ({ task, groupId, projectId, onAccept, onReject, onForward, onUpdate, onLeave, onView, onDelete }) => {
  const navigate = useNavigate();
  const progress = task.progress ?? 0;

  const gId = groupId ?? task.groupId?._id ?? task.groupId;
  const pId = projectId ?? task.projectId?._id ?? task.projectId;

  // Feature #9 — show everyone actually assigned (not just the legacy
  // single assignedTo field), falling back to it only for older tasks
  // that predate multi-assignee support and have no assignees array.
  const activeAssignees = (task.assignees || []).filter(a => !a.leftAt);
  const assignedNames = activeAssignees.length > 0
    ? activeAssignees.map(a => a.userId?.name ?? 'Member').join(', ')
    : (task.assignedTo?.name ?? 'Unassigned');

  const actions = [
    onAccept  && { label: 'Accept',  handler: onAccept,  cls: 'border-green-500/40  text-green-300  hover:bg-green-500/10'  },
    onReject  && { label: 'Reject',  handler: onReject,  cls: 'border-red-500/40    text-red-300    hover:bg-red-500/10'    },
    onForward && { label: 'Forward', handler: onForward, cls: 'border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10' },
    onUpdate  && { label: 'Update',  handler: onUpdate,  cls: 'border-blue-500/40   text-blue-300   hover:bg-blue-500/10'   },
    onLeave   && { label: 'Leave',   handler: onLeave,   cls: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/10' },
    onView    && { label: 'View',    handler: onView,    cls: 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10' },
  ].filter(Boolean);

  return (
    <div
      onClick={() => navigate(`/groups/${gId}/projects/${pId}/tasks/${task._id}`)}
      className="bg-[var(--pms-bg-surface-alt)] rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 cursor-pointer p-5 space-y-3"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <Heading level={4} size="text-sm" className="flex-1 flex items-center gap-1.5">
          {task.title}
          {task.visibility === 'private' && (
            <Lock size={11} className="text-gray-500 shrink-0" title="Private — only assigned members can see this task" />
          )}
        </Heading>
        <StatusBadge status={task.status ?? 'pending'} />
      </div>

      <Text size="text-xs" color="text-gray-400">{task.description ?? 'No description.'}</Text>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span className="font-semibold text-white">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span>Assigned: <span className="text-gray-200">{assignedNames}</span></span>
        {task.deadline && <span>Due {formatDate(task.deadline)}</span>}
      </div>

      {/* Action buttons */}
      {(actions.length > 0 || onDelete) && (
        <div onClick={e => e.stopPropagation()} className="flex gap-2 pt-1 flex-wrap">
          {actions.map(({ label, handler, cls }) => (
            <button
              key={label}
              onClick={handler}
              className={`flex-1 min-w-[70px] px-2 py-1.5 text-xs border rounded-lg transition font-medium ${cls}`}
            >
              {label}
            </button>
          ))}
          {onDelete && (
            <Button
              variant="dangerTint"
              size="sm"
              rounded="lg"
              weight="font-medium"
              icon={Trash2}
              iconSize={12}
              onClick={onDelete}
              title="Move task to trash"
            >
              Trash
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;