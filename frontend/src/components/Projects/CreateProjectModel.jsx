import { useState } from 'react';
import Modal from '../ui/Model';
import { projectService } from '../../services/projectTaskService';
import { todayInputValue } from '../../utils/date';
import useFileAttachments from '../../hooks/useFileAttachments';
import FileDropZone from '../ui/FileDropZone';
import ErrorBanner from '../ui/ErrorBanner';
import Textarea from '../ui/Textarea';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Calendar } from 'lucide-react';

const CreateProjectModal = ({ isOpen, onClose, onSuccess, groupId }) => {
  const [form,    setForm]    = useState({ name: '', description: '', deadline: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Feature #10 — Multiple File Upload / drag & drop.
  const {
    files, setFiles, dragOver, setDragOver, convertingFiles,
    handleFiles, handleDrop, removeFile,
  } = useFileAttachments();

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await projectService.create(groupId, {
        name:        form.name,
        description: form.description,
        deadline:    form.deadline || undefined,
        files:       files.length ? files : undefined,
      });
      setForm({ name: '', description: '', deadline: '' });
      setFiles([]);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const today = todayInputValue();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorBanner message={error} />

        {/* Name */}
        <Input
          label="Project name"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Quantum Sensing Research"
        />

        {/* Description */}
        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          placeholder="What is this project about?"
        />

        {/* Deadline */}
        <Input
          label="Deadline (optional)"
          name="deadline"
          type="date"
          min={today}
          value={form.deadline}
          onChange={handleChange}
          className="appearance-none cursor-pointer"
          rightElement={<Calendar size={16} className="pointer-events-none text-purple-300/90" />}
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Creating…' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;