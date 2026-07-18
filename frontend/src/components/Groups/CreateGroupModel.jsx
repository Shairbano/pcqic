import { useState, useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import Modal from '../ui/Model';
import groupService from '../../services/groupService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import ErrorBanner from '../ui/ErrorBanner';
import Text from '../ui/Text';

const CreateGroupModal = ({ isOpen, onClose, onSuccess, subtitle }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const reset = () => {
    setForm({ name: '', description: '' });
    setCoverPhoto(null);
    setCoverPosition({ x: 50, y: 50 });
    setPreview('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Cover photo must be under 2 MB.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setCoverPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await groupService.create({ ...form, coverPhoto: coverPhoto || undefined, coverPosition });
      reset();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group" subtitle={subtitle} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorBanner message={error} />

        <div className="space-y-2">
          <Text as="label" variant="label">
            Cover Photo (optional)
          </Text>
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-full h-28 rounded-xl border-2 border-dashed border-[var(--pms-bg-header)] hover:border-purple-500/60 transition cursor-pointer overflow-hidden flex items-center justify-center bg-[var(--pms-bg-inset)]"
          >
            {preview ? (
              <img
                src={preview}
                alt="cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
              />
            ) : (
              <div className="text-center">
                <ImagePlus size={28} className="text-gray-500 mx-auto" />
                <Text size="text-xs" color="text-gray-500" className="mt-2">Click to upload (max 2 MB)</Text>
              </div>
            )}
            {preview && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                <Text size="text-sm" weight="font-semibold" color="text-white">Change photo</Text>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Text as="label" size="text-xs" color="text-gray-400">
                  Horizontal
                  <input type="range" min="0" max="100" value={coverPosition.x} onChange={e => setCoverPosition(p => ({ ...p, x: Number(e.target.value) }))} className="w-full accent-purple-500" />
                </Text>
                <Text as="label" size="text-xs" color="text-gray-400">
                  Vertical
                  <input type="range" min="0" max="100" value={coverPosition.y} onChange={e => setCoverPosition(p => ({ ...p, y: Number(e.target.value) }))} className="w-full accent-purple-500" />
                </Text>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => { setCoverPhoto(null); setPreview(''); setCoverPosition({ x: 50, y: 50 }); }}
              >
                Remove photo
              </Button>
            </div>
          )}
        </div>

        <Input
          label="Group name"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Quantum Optics Lab"
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          placeholder="What is this group about?"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;