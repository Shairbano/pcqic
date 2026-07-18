import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { taskService } from '../../services/projectTaskService';
import api from '../../utils/api';
import { useAuth } from '../../context/authContext';
import { todayInputValue } from '../../utils/date';
import useFileAttachments from '../../hooks/useFileAttachments';
import FileDropZone from '../ui/FileDropZone';
import ErrorBanner from '../ui/ErrorBanner';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Heading from '../ui/Heading';
import Text from '../ui/Text';

const CreateTaskModal = ({ isOpen, onClose, onSuccess, groupId, projectId }) => {
  const { user } = useAuth();
  const [form,    setForm]    = useState({ title: '', description: '', deadline: '', assignedTo: '', weightPercent: '', visibility: 'group' });
  const [additionalAssignees, setAdditionalAssignees] = useState([]); // Feature #9
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Feature #10 — Multiple File Upload / drag & drop.
  const {
    files, setFiles, dragOver, setDragOver, convertingFiles,
    handleFiles, handleDrop, removeFile,
  } = useFileAttachments();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // FIX 3: Load ALL accepted members, exclude only the current user (group head/task creator)
  useEffect(() => {
    if (!isOpen || !groupId) return;
    api.get(`/group/${groupId}`)
      .then(r => {
        const grp = r.data.group ?? r.data;
        const accepted = (grp.members ?? []).filter(
          m => m.status === 'accepted' &&
               (m.userId?._id ?? m.userId)?.toString() !== user?.id?.toString()
        );
        setMembers(accepted);
      })
      .catch(() => setMembers([]));
  }, [isOpen, groupId, user?.id]);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.assignedTo && form.assignedTo === user?.id?.toString()) {
      setError('You cannot assign a task to yourself.');
      return;
    }
    const weightValue = form.weightPercent === '' ? NaN : Number(form.weightPercent);
    if (Number.isNaN(weightValue) || weightValue <= 0 || weightValue > 100) {
      setError('Please enter a weight between 1 and 100 — every task must carry a real share of the project.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await taskService.create(groupId, projectId, {
        title:       form.title,
        description: form.description,
        deadline:    form.deadline || undefined,
        assignedTo:  form.assignedTo || undefined,
        additionalAssignees: additionalAssignees.length ? additionalAssignees : undefined,
        weightPercent: form.weightPercent !== '' ? Number(form.weightPercent) : undefined,
        visibility:  form.visibility,
        files:       files.length ? files : undefined,
      });
      setForm({ title: '', description: '', deadline: '', assignedTo: '', weightPercent: '', visibility: 'group' });
      setAdditionalAssignees([]);
      setFiles([]);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const today = todayInputValue();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg my-8 bg-[var(--pms-bg-modal)] border border-[var(--pms-bg-header)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--pms-bg-header)] border-b border-white/5 sticky top-0 z-10">
          <Heading level={3} size="text-sm" weight="font-semibold">Create New Task</Heading>
          <Button
            variant="bare"
            size="none"
            rounded="lg"
            weight="font-normal"
            iconSize={18}
            icon={X}
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/10"
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <ErrorBanner message={error} />

          <Input
            label="Task title"
            name="title"
            required
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Research quantum entanglement"
          />

          <Textarea
            label="Description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="What needs to be done?"
          />

          {/* FIX 3: Shows all accepted group members except the group head (task creator) */}
          <div className="space-y-1">
            <Select label="Assign to (primary)" name="assignedTo" value={form.assignedTo} onChange={handleChange}>
              <option value="">— Unassigned —</option>
              {members.map(m => {
                const uid  = m.userId?._id ?? m.userId;
                const name = m.userId?.name ?? 'Member';
                const role = m.userId?.role ? ` (${m.userId.role})` : '';
                return <option key={uid} value={uid}>{name}{role}</option>;
              })}
            </Select>
            {members.length === 0 && (
              <Text size="text-xs" color="text-gray-500" className="italic mt-1">No other members available to assign.</Text>
            )}
          </div>

          {/* Who can see this task */}
          <Select
            label="Visibility"
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
          >
            <option value="group">Group (visible to everyone in the group)</option>
            <option value="private">Private (only the assigned members)</option>
          </Select>

          {/* Feature #9 — Multiple Members on Same Task */}
          {members.length > 0 && (
            <div className="space-y-1">
              <Text as="label" variant="label">Additional members working this task (optional)</Text>
              <div className="grid grid-cols-2 gap-2 bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg p-3 max-h-32 overflow-y-auto">
                {members
                  .filter(m => (m.userId?._id ?? m.userId)?.toString() !== form.assignedTo)
                  .map(m => {
                    const uid = (m.userId?._id ?? m.userId)?.toString();
                    const checked = additionalAssignees.includes(uid);
                    return (
                      <Text as="label" key={uid} size="text-xs" color="text-gray-300" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setAdditionalAssignees(prev =>
                            checked ? prev.filter(id => id !== uid) : [...prev, uid]
                          )}
                          className="accent-purple-500"
                        />
                        {m.userId?.name ?? 'Member'}
                      </Text>
                    );
                  })}
              </div>
              <Text size="text-xs" color="text-gray-500">Everyone checked works this task at the same time, each tracking their own progress.</Text>
            </div>
          )}

          {/* Feature #12 — this task's share of overall project progress. Mandatory: every task must carry a real weight. */}
          <div className="space-y-1">
            <Input
              label="Weight (% of overall project progress)"
              type="number"
              required
              min="1"
              max="100"
              name="weightPercent"
              value={form.weightPercent}
              onChange={handleChange}
              placeholder="e.g. 20"
            />
            <Text size="text-xs" color="text-gray-500">Required — when this task hits 100%, that % of the whole project's progress bar fills in.</Text>
          </div>

          <Input
            label="Deadline (optional)"
            name="deadline"
            type="date"
            min={today}
            value={form.deadline}
            onChange={handleChange}
          />
          {/* Feature #10 — File Attachments */}
          <FileDropZone
            files={files}
            dragOver={dragOver}
            setDragOver={setDragOver}
            convertingFiles={convertingFiles}
            onFilesPicked={handleFiles}
            onDrop={handleDrop}
            onRemoveFile={removeFile}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" rounded="lg" loading={loading}>
              {loading ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateTaskModal;