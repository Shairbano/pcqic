import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { taskService } from '../../services/projectTaskService';
import StatusBadge from '../ui/StatusBadge';
import TaskTimeline from './Tasktimeline';
import { useAuth } from '../../context/authContext';
import { formatDate } from '../../utils/date';
import DetailBackButton from '../ui/DetailBackButton';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import ProgressSlider from '../ui/ProgressSlider';
import Heading from '../ui/Heading';
import Text from '../ui/Text';

const TaskDetail = ({ groupId, projectId, taskId }) => {
  const { user } = useAuth();
  const [task,     setTask]     = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [note,     setNote]     = useState('');
  const [progress, setProgress] = useState(0);
  const [files,    setFiles]    = useState([]);
  const [error,    setError]    = useState('');
  const fileRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const fetchTask = async () => {
      try {
        const res = await taskService.getById(groupId, projectId, taskId);
        if (!cancelled) {
          const t = res.data.task ?? res.data;
          setTask(t);
          setProgress(t?.progress ?? 0);
          setHistory(t?.history ?? []);
        }
      } catch (err) {
        if (!cancelled) setError('Could not load task.');
        console.error('Failed to fetch task details:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTask();
    return () => { cancelled = true; };
  }, [groupId, projectId, taskId]);

  const refresh = async () => {
    const res = await taskService.getById(groupId, projectId, taskId);
    const t = res.data.task ?? res.data;
    setTask(t);
    setProgress(t?.progress ?? 0);
    setHistory(t?.history ?? []);
  };

  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files);
    const converted = await Promise.all(
      picked.map(f => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res({ name: f.name, data: reader.result.split(',')[1], mimeType: f.type, size: f.size });
        reader.onerror = rej;
        reader.readAsDataURL(f);
      }))
    );
    setFiles(prev => [...prev, ...converted]);
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const fmtSize = (b) =>
    b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  const handleUpdate = async (progressOverride) => {
    const finalProgress = progressOverride ?? progress;
    try {
      await taskService.update(groupId, projectId, taskId, finalProgress, note, files.length ? files : undefined);
      setNote('');
      setFiles([]);
      await refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update task');
    }
  };

  // Guards against double-submission: ProgressSlider fires both onChange AND
  // onInput for the same final value (intentional, for live visual feedback
  // while dragging) — without this guard, both events would call
  // handleUpdate(100) back-to-back, and the second call would be rejected
  // by the backend (task is no longer 'accepted'/'in_progress' after the
  // first call completes it), producing a console error and leaving things
  // in an inconsistent state.
  const autoSubmittedRef = useRef(false);

  // Auto-complete: reaching 100% on the slider submits immediately — no
  // separate button click needed. Passes 100 explicitly rather than relying
  // on `progress` state (which wouldn't have updated yet in this same tick)
  // to avoid submitting a stale value.
  const handleProgressChange = (value) => {
    setProgress(value);
    if (value === 100) {
      if (autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;
      handleUpdate(100);
    } else {
      autoSubmittedRef.current = false;
    }
  };

  const handleAccept = async () => {
    try { await taskService.accept(groupId, projectId, taskId); await refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to accept task'); }
  };

  const handleReject = async () => {
    const reason = window.prompt('Reason for rejecting (optional):') ?? '';
    try { await taskService.reject(groupId, projectId, taskId, reason); await refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to reject task'); }
  };

  const handleLeave = async () => {
    const reason = window.prompt('Reason for leaving this task (required):');
    if (reason === null) return; // cancelled
    if (!reason.trim()) { alert('A reason is required to leave a task'); return; }
    try { await taskService.leave(groupId, projectId, taskId, reason.trim()); await refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to leave task'); }
  };

  if (loading) return <div className="text-center py-12 text-purple-400 animate-pulse">Loading…</div>;
  if (error)   return <div className="text-center py-12 text-red-400">{error}</div>;
  if (!task)   return null;

  const myId = user?.id?.toString();

  // Feature #9 — show everyone actually assigned (not just the legacy
  // single assignedTo field), falling back to it only for older tasks
  // that predate multi-assignee support and have no assignees array.
  const activeAssignees = (task.assignees || []).filter(a => !a.leftAt);
  const assignedNames = activeAssignees.length > 0
    ? activeAssignees.map(a => a.userId?.name ?? 'Member').join(', ')
    : (task.assignedTo?.name ?? 'Unassigned');

  const isCreator =
    task.createdBy?._id?.toString() === myId ||
    task.createdBy?.toString() === myId;

  // Feature #9 — the per-member assignees array is authoritative; fall back
  // to the legacy single `assignedTo` field only for tasks that predate it.
  const myAssigneeEntry = (task.assignees || []).find(a => {
    if (a.leftAt) return false;
    const uid = a.userId?._id?.toString() ?? a.userId?.toString();
    return uid === myId;
  });
  const isLegacyAssignee =
    (!task.assignees || task.assignees.length === 0) &&
    (task.assignedTo?._id?.toString() === myId || task.assignedTo?.toString() === myId);

  // The creator/group head is only excluded from the LEGACY single-assignee
  // fallback match (which could ambiguously overlap with old data that
  // predates per-member assignees) — but if they have a genuine Feature #9
  // assignee entry (they explicitly assigned themselves as a working
  // member on this task), that's honored just like anyone else's.
  const isAssignee = !!myAssigneeEntry || (isLegacyAssignee && !isCreator);

  const entryStatus = myAssigneeEntry?.status ?? task.status;
  const canAccept = isAssignee && entryStatus === 'pending';
  // Only an actual assignee can update progress — a creator/group head who
  // ISN'T also a genuine assignee on this task cannot, even while viewing
  // this same page. (If they self-assigned, isAssignee above already
  // reflects that — see the comment there.)
  const canUpdate = isAssignee && ['accepted', 'in_progress'].includes(entryStatus);
  const canLeave  = isAssignee && ['accepted', 'in_progress'].includes(entryStatus);

  return (
    <div className="space-y-6">
      <DetailBackButton to={`/groups/${groupId}/projects/${projectId}`}>Back to Project</DetailBackButton>

      {/* Title + description */}
      <div className="space-y-3">
        <div>
          <Heading level={1}>{task.title}</Heading>
          <Text size="" color="text-gray-400" className="mt-1">{task.description}</Text>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge status={task.status ?? 'pending'} />
          {task.visibility === 'private' && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lock size={12} /> Private — only assigned members can see this task
            </span>
          )}
        </div>
      </div>

      {/* Current progress display */}
      <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-6 space-y-3">
        <div className="flex justify-between items-center">
          <Text as="span" size="text-sm" weight="font-medium" color="text-gray-300">Progress</Text>
          <Text as="span" size="text-2xl" weight="font-bold" color="text-purple-400">{task.progress ?? 0}%</Text>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${task.progress ?? 0}%` }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-4">
          <Text size="text-xs" color="text-gray-400" className="uppercase tracking-wide">Assigned to</Text>
          <Text size="" weight="font-medium" color="text-white" className="mt-2">{assignedNames}</Text>
        </div>
        <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-4">
          <Text size="text-xs" color="text-gray-400" className="uppercase tracking-wide">Due date</Text>
          <Text size="" weight="font-medium" color="text-white" className="mt-2">
            {task.deadline ? formatDate(task.deadline) : '—'}
          </Text>
        </div>
        <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-4">
          <Text size="text-xs" color="text-gray-400" className="uppercase tracking-wide">Status</Text>
          <div className="mt-2"><StatusBadge status={task.status ?? 'pending'} /></div>
        </div>
      </div>

      {/* Accept / Reject buttons */}
      {canAccept && (
        <div className="flex gap-3">
          <Button variant="successSolid" size="none" rounded="xl" className="flex-1 py-2.5 text-sm" onClick={handleAccept}>
            Accept Task
          </Button>
          <Button variant="dangerSolid" size="none" rounded="xl" className="flex-1 py-2.5 text-sm" onClick={handleReject}>
            Reject Task
          </Button>
        </div>
      )}

      {canLeave && (
        <Button
          variant="bare"
          size="none"
          rounded="xl"
          className="px-6 py-2.5 text-sm bg-orange-600 hover:bg-orange-700 text-white"
          onClick={handleLeave}
        >
           Leave Task
        </Button>
      )}

      {/* Update Progress panel — visible to the assignee only, never the creator/group head */}
      {canUpdate && (
        <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-6 space-y-4">
          <Heading level={3} size="text-sm">Update Progress</Heading>

          {/* Progress slider */}
          <ProgressSlider progress={progress} onChange={handleProgressChange} />

          {/* Note */}
          <Textarea
            label="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What did you work on?"
            className="h-20"
          />

          {/* File attachment */}
          <div>
            <Text as="label" size="text-xs" color="text-gray-400" className="block uppercase tracking-wide mb-1">
              Attach files (optional)
            </Text>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 w-full h-14 rounded-xl border-2 border-dashed
                         border-[var(--pms-bg-header)] hover:border-purple-500/60 transition cursor-pointer
                         bg-[var(--pms-bg-inset)] px-4"
            >
              <span className="text-xl">📎</span>
              <div>
                <Text size="text-xs" weight="font-medium" color="text-gray-400">Click to attach files</Text>
                <Text size="text-xs" color="text-gray-600">PDF, images, docs — any format</Text>
              </div>
            </div>
            <input ref={fileRef} type="file" multiple onChange={handleFiles} className="hidden" />

            {files.length > 0 && (
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-[var(--pms-bg-surface)] rounded-lg px-3 py-2 border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">📄</span>
                      <div className="min-w-0">
                        <Text size="text-xs" color="text-white" className="truncate">{f.name}</Text>
                        <Text size="text-xs" color="text-gray-500">{fmtSize(f.size)}</Text>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="bare"
                      size="none"
                      rounded="none"
                      weight="font-normal"
                      onClick={() => removeFile(i)}
                      className="ml-3 text-gray-500 hover:text-red-400 text-lg leading-none flex-shrink-0"
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" size="none" rounded="xl" className="w-full py-2.5 text-sm" onClick={() => handleUpdate()}>
            {progress >= 100 ? '✓ Mark Complete' : 'Save Update'}
          </Button>
        </div>
      )}

      {/* Activity timeline */}
      <div className="bg-[var(--pms-bg-surface)]/60 rounded-2xl border border-white/5 p-6 space-y-4">
        <Heading level={3} size="text-sm">Activity Timeline</Heading>
        <TaskTimeline events={history} />
      </div>
    </div>
  );
};

export default TaskDetail;