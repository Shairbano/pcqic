import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/authContext';
import { taskService } from '../../services/projectTaskService';
import useCancellableFetch from '../../hooks/useCancellableFetch';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModel';
import Modal from '../ui/Model';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import ProgressSlider from '../ui/ProgressSlider';
import Button from '../ui/Button';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import api from '../../utils/api';
import { ClipboardList, Plus, X, ChevronRight } from 'lucide-react';

// ── Forward modal ─────────────────────────────────────────────────────────────
// Reuses the shared draggable Modal shell (../ui/Model) instead of
// reimplementing drag/backdrop/header chrome locally.
const ForwardModal = ({ task, groupId, onDone, onClose }) => {
  const [members,    setMembers]    = useState([]);
  const [forwardTo,  setForwardTo]  = useState('');
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/group/${groupId}`)
      .then(r => {
        const grp = r.data.group ?? r.data;
        setMembers((grp.members ?? []).filter(m => m.status === 'accepted'));
      }).catch(() => {});
  }, [groupId]);

  const handleSubmit = async () => {
    if (!forwardTo) return;
    setSubmitting(true);
    try {
      await taskService.forward(groupId, task.projectId?._id ?? task.projectId, task._id, forwardTo, note);
      onDone();
    } catch (e) {
      alert(e.response?.data?.message || 'Forward failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Forward Task" size="sm">
      <div className="space-y-4">
        <Text size="text-xs" color="text-gray-500" className="italic">"{task.title}"</Text>
        <Select
          label="Forward to"
          size="sm"
          value={forwardTo}
          onChange={e => setForwardTo(e.target.value)}
        >
          <option value="">— Select member —</option>
          {members.map(m => (
            <option key={m.userId?._id ?? m.userId} value={m.userId?._id ?? m.userId}>
              {m.userId?.name ?? 'Member'}
            </option>
          ))}
        </Select>
        <Textarea
          label="Note (optional)"
          size="sm"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="info"
            rounded="lg"
            icon={ChevronRight}
            iconSize={14}
            disabled={!forwardTo}
            loading={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Forwarding…' : 'Forward'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Update/progress modal ─────────────────────────────────────────────────────
// Also reuses the shared Modal shell — same reasoning as ForwardModal above.
const UpdateModal = ({ task, groupId, onDone, onClose }) => {
  const [progress,   setProgress]   = useState(task.progress ?? 0);
  const [note,       setNote]       = useState('');
  const [files,      setFiles]      = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files);
    const converted = await Promise.all(picked.map(f =>
      new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res({ name: f.name, data: r.result.split(',')[1], mimeType: f.type, size: f.size });
        r.onerror = rej;
        r.readAsDataURL(f);
      })
    ));
    setFiles(prev => [...prev, ...converted]);
    e.target.value = '';
  };

  const fmtSize = b => b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

  const handleSubmit = async (progressOverride) => {
    const finalProgress = progressOverride ?? progress;
    setSubmitting(true);
    try {
      await taskService.update(
        groupId,
        task.projectId?._id ?? task.projectId,
        task._id,
        finalProgress,
        note,
        files.length ? files : undefined
      );
      onDone();
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Guards against double-submission: ProgressSlider fires both onChange AND
  // onInput for the same final value (intentional, for live visual feedback
  // while dragging) — without this guard, both events would call
  // handleSubmit(100) back-to-back. The second call would then be rejected
  // by the backend (task is no longer 'accepted'/'in_progress' after the
  // first call completes it), producing a console error and leaving things
  // in an inconsistent state.
  const autoSubmittedRef = useRef(false);

  // Auto-complete: reaching 100% on the slider submits immediately — no
  // separate button click needed. Passes 100 explicitly rather than relying
  // on the `progress` state (which wouldn't have updated yet in this same
  // tick) to avoid submitting a stale value.
  const handleProgressChange = (value) => {
    setProgress(value);
    if (value === 100) {
      if (autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;
      handleSubmit(100);
    } else {
      autoSubmittedRef.current = false;
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Update Progress" size="sm">
      <div className="space-y-4">
        <Text size="text-xs" color="text-gray-500" className="italic">"{task.title}"</Text>

        <ProgressSlider progress={progress} onChange={handleProgressChange} />

        <Textarea
          label="Note (optional)"
          size="sm"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What did you work on?"
        />

        <div>
          <Text as="label" size="text-xs" color="text-gray-400" className="block uppercase tracking-wide mb-1">Attach files (optional)</Text>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 w-full h-12 rounded-xl border-2 border-dashed border-[var(--pms-bg-header)] hover:border-purple-500/60 transition cursor-pointer bg-[var(--pms-bg-inset)] px-4"
          >
            <Plus size={14} className="text-gray-500" />
            <Text size="text-xs" color="text-gray-500">Click to attach files</Text>
          </div>
          <input ref={fileRef} type="file" multiple onChange={handleFiles} className="hidden" />
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-[var(--pms-bg-surface)] rounded-lg px-3 py-1.5 mt-1 border border-white/5">
              <span className="text-xs text-gray-300 truncate">
                {f.name} <span className="text-gray-500">({fmtSize(f.size)})</span>
              </span>
              <Button
                variant="bare"
                size="none"
                rounded="none"
                weight="font-normal"
                icon={X}
                iconSize={13}
                onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                className="text-gray-500 hover:text-red-400 ml-2"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            rounded="lg"
            loading={submitting}
            onClick={() => handleSubmit()}
          >
            {submitting ? 'Saving…' : progress >= 100 ? '✓ Mark Complete' : 'Save Update'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main TaskList ─────────────────────────────────────────────────────────────
const TaskList = ({ groupId, projectId, accessLevel: fallbackLevel }) => {
  const { user } = useAuth();
  const [showCreate,  setShowCreate]  = useState(false);
  const [forwardTask, setForwardTask] = useState(null);
  const [updateTask,  setUpdateTask]  = useState(null);

  // Access level: 1 = group head (full control), 0 = member (update own tasks only).
  // fallbackLevel comes from ProjectDetail which reads project.access_level from backend.
  // The backend only returns 1 for the actual group head — never for role=admin alone.
  const isGroupHead = (fallbackLevel ?? 0) === 1;

  const fetchTasks = useCallback(
    () => taskService.getByProject(groupId, projectId).then(r => r.data.tasks ?? r.data ?? []),
    [groupId, projectId]
  );
  const {
    data: tasks, loading, error, reload,
  } = useCancellableFetch(fetchTasks, [groupId, projectId], { errorMessage: 'Could not load tasks.' });

  // Original refresh() never toggled the loading state (silent re-fetch after
  // an accept/reject/forward/update/leave action) — `silent: true` preserves that.
  const refresh = () => reload({ silent: true });

  const handleDelete = async (e, taskId, title) => {
    e.stopPropagation();
    if (!window.confirm(`Move task "${title}" to trash?`)) return;
    try {
      await taskService.delete(groupId, projectId, taskId);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to move task to trash');
    }
  };

  const isAssignee = (task) => {
    const myId = user?.id?.toString();
    const inAssigneesArray = (task.assignees || []).some(a => {
      if (a.leftAt) return false;
      const uid = a.userId?._id?.toString() ?? a.userId?.toString();
      return uid === myId;
    });
    const legacyMatch =
      (!task.assignees || task.assignees.length === 0) &&
      (task.assignedTo?._id?.toString() === myId || task.assignedTo?.toString() === myId);
    return inAssigneesArray || legacyMatch;
  };

  // Feature #9 — this member's own status on the task (accepted/pending/etc),
  // falling back to the task-level status for legacy single-assignee tasks.
  const myEntryStatus = (task) => {
    const myId = user?.id?.toString();
    const entry = (task.assignees || []).find(a => {
      if (a.leftAt) return false;
      const uid = a.userId?._id?.toString() ?? a.userId?.toString();
      return uid === myId;
    });
    return entry ? entry.status : task.status;
  };

  // Only the assignee can update progress — the group head/creator cannot,
  // even from this card view.
  const canUpdateTask = (task) =>
    isAssignee(task) && ['accepted', 'in_progress'].includes(myEntryStatus(task));

  const handleAccept = async (task) => {
    try { await taskService.accept(groupId, projectId, task._id); refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to accept task'); }
  };

  const handleReject = async (task) => {
    const note = window.prompt('Reason for rejecting (optional):') ?? '';
    try { await taskService.reject(groupId, projectId, task._id, note); refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to reject task'); }
  };

  const handleLeave = async (task) => {
    const reason = window.prompt('Reason for leaving this task (required):');
    if (reason === null) return; // cancelled
    if (!reason.trim()) { alert('A reason is required to leave a task'); return; }
    try { await taskService.leave(groupId, projectId, task._id, reason.trim()); refresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to leave task'); }
  };

  return (
    <>
      {/* ── Header row with "New Task" button ── */}
      <div className="flex items-center justify-between mb-5">
        <Heading level={2} size="text-lg" className="flex items-center gap-2">
          <ClipboardList size={18} className="text-purple-400" /> Tasks
          {!loading && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-white/5 border border-white/10 rounded-full text-gray-400">
              {tasks.length}
            </span>
          )}
        </Heading>

        {/* ── Only the group head sees the New Task button ── */}
        {isGroupHead && (
          <Button variant="primaryGradient" icon={Plus} iconSize={15} onClick={() => setShowCreate(true)}>
            New Task
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* ── Empty state — dark background, purple accent ── */
        <div className="flex flex-col items-center justify-center py-16 text-center
                        rounded-2xl bg-[var(--pms-bg-inset)]/60 border border-white/5">
          <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20
                          flex items-center justify-center mb-4">
            <ClipboardList size={32} className="text-purple-400" />
          </div>
          <Heading level={3} size="text-base" weight="font-semibold" color="text-gray-200" className="mb-1">No tasks yet</Heading>
          <Text size="text-sm" color="text-gray-500" className="mb-5 max-w-xs">
            {isGroupHead
              ? 'Create the first task and assign it to a member.'
              : 'No tasks have been assigned to this project yet.'}
          </Text>
          {isGroupHead && (
            <Button variant="primaryGradient" icon={Plus} iconSize={15} size="lg" onClick={() => setShowCreate(true)}>
              Create First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(t => (
            <TaskCard
              key={t._id}
              task={t}
              groupId={groupId}
              projectId={projectId}
              canManage={isGroupHead || canUpdateTask(t)}
              onDelete={isGroupHead ? (e) => handleDelete(e, t._id, t.title) : undefined}
              onAccept={isAssignee(t) && myEntryStatus(t) === 'pending' ? () => handleAccept(t) : undefined}
              onReject={isAssignee(t) && ['pending', 'accepted'].includes(myEntryStatus(t)) ? () => handleReject(t) : undefined}
              onForward={isGroupHead && t.status !== 'completed' ? () => setForwardTask(t) : undefined}
              onUpdate={canUpdateTask(t) ? () => setUpdateTask(t) : undefined}
              onLeave={isAssignee(t) && ['accepted', 'in_progress'].includes(myEntryStatus(t)) ? () => handleLeave(t) : undefined}
            />
          ))}
        </div>
      )}

      {/* Modals — only group head can open Create */}
      {isGroupHead && (
        <CreateTaskModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={refresh}
          groupId={groupId}
          projectId={projectId}
        />
      )}

      {forwardTask && (
        <ForwardModal
          task={forwardTask}
          groupId={groupId}
          onDone={() => { setForwardTask(null); refresh(); }}
          onClose={() => setForwardTask(null)}
        />
      )}

      {updateTask && (
        <UpdateModal
          task={updateTask}
          groupId={groupId}
          onDone={() => { setUpdateTask(null); refresh(); }}
          onClose={() => setUpdateTask(null)}
        />
      )}
    </>
  );
};

export default TaskList;