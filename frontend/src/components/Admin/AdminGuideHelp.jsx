// src/components/Admin/AdminGuideHelp.jsx
import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Modal from '../ui/Model';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import { formatDate } from '../../utils/date';
import Badge from '../ui/Badge';
import {
  HelpCircle, Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, GripVertical,
  Rocket, UserCircle2, Users, FolderKanban, ListChecks, Archive, Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'Getting Started', 'Account', 'Groups', 'Projects', 'Tasks', 'Locked Items', 'Other',
];

// Same category → icon/color mapping used on the user-facing Guide & Help
// page, so the admin table visually matches what users will see.
const CATEGORY_META = {
  'Getting Started': { icon: Rocket,       badge: 'purple' },
  'Account':         { icon: UserCircle2,  badge: 'blue'   },
  'Groups':          { icon: Users,        badge: 'red'    },
  'Projects':        { icon: FolderKanban, badge: 'orange' },
  'Tasks':           { icon: ListChecks,   badge: 'green'  },
  'Locked Items':    { icon: Archive,      badge: 'gray'   },
  'Other':           { icon: Sparkles,     badge: 'yellow' },
};
const metaFor = (category) => CATEGORY_META[category] || { icon: HelpCircle, badge: 'purple' };

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB, same limit as group cover photos
const emptyStep = () => ({ text: '', image: null });
const emptyForm = { title: '', steps: [emptyStep()], category: 'Getting Started', order: 0, isPublished: true };

// Turns whatever shape a guide is currently stored in into a `steps` array
// for the form: new-format entries already have `steps`; entries created
// before the step-builder existed only have the old single `content`/
// `image` fields, so those get folded into a single step here. Either way
// the admin edits it as steps from now on, and it saves back in the new
// format.
const stepsFromGuide = (guide) => {
  if (guide.steps?.length) return guide.steps.map(s => ({ text: s.text, image: s.image ?? null }));
  if (guide.content) return [{ text: guide.content, image: guide.image ?? null }];
  return [emptyStep()];
};

const AdminGuideHelp = () => {
  const [guides, setGuides]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null); // guide being edited, or null for "create"
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [imageError, setImageError] = useState('');
  const stepFileRefs = useRef({});

  useEffect(() => {
    api.get('/guides')
      .then(res => setGuides(res.data.guides ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setImageError('');
    setShowModal(true);
  };

  const openEdit = (guide) => {
    setEditing(guide);
    setForm({
      title: guide.title,
      steps: stepsFromGuide(guide),
      category: guide.category,
      order: guide.order,
      isPublished: guide.isPublished,
    });
    setError('');
    setImageError('');
    setShowModal(true);
  };

  const updateStep = (index, patch) => {
    setForm(prev => {
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setForm(prev => ({ ...prev, steps: [...prev.steps, emptyStep()] }));
  };

  const removeStep = (index) => {
    setForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  const handleStepImagePick = (index, e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateStep(index, { image: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const cleanedSteps = form.steps
      .map(s => ({ text: s.text.trim(), image: s.image || undefined }))
      .filter(s => s.text);

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (cleanedSteps.length === 0) {
      setError('Add at least one step with some text');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        steps: cleanedSteps,
        category: form.category,
        order: form.order,
        isPublished: form.isPublished,
      };
      if (editing) {
        const res = await api.patch(`/guides/${editing._id}`, payload);
        setGuides(prev => prev.map(g => g._id === editing._id ? res.data.guide : g));
      } else {
        const res = await api.post('/guides', payload);
        setGuides(prev => [...prev, res.data.guide]);
      }
      setShowModal(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save guide');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (guide) => {
    try {
      const res = await api.patch(`/guides/${guide._id}`, { isPublished: !guide.isPublished });
      setGuides(prev => prev.map(g => g._id === guide._id ? res.data.guide : g));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update guide');
    }
  };

  const handleDelete = async (guide) => {
    if (!window.confirm(`Delete "${guide.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/guides/${guide._id}`);
      setGuides(prev => prev.filter(g => g._id !== guide._id));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete guide');
    }
  };

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading guide entries...</div>;

  const previewImage = (guide) => guide.steps?.find(s => s.image)?.image ?? guide.image;
  const stepCount = (guide) => guide.steps?.length || (guide.content ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading level={2} className="flex items-center gap-2">
            <HelpCircle size={22} className="text-purple-400" /> Guide &amp; Help
          </Heading>
          <Text size="text-sm" color="text-gray-400">
            {guides.length} entr{guides.length !== 1 ? 'ies' : 'y'} — shown read-only in the user dashboard.
          </Text>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add Entry</Button>
      </div>

      {guides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HelpCircle size={46} className="text-gray-600 mb-4" />
          <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-300">No guide entries yet</Heading>
          <Text size="text-sm" color="text-gray-500">Add your first entry to help users learn the platform.</Text>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-purple-900/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--pms-bg-header)] text-gray-400 uppercase text-xs">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Steps</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Updated</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guides.map(g => {
                const { icon: CategoryIcon, badge } = metaFor(g.category);
                const thumb = previewImage(g);
                return (
                <tr key={g._id} className="border-t border-white/5 bg-[var(--pms-bg-surface-alt)] hover:bg-[var(--pms-bg-hover)] transition">
                  <td className="p-3 text-gray-200 max-w-xs">
                    <div className="flex items-center gap-2">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-8 w-8 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <span className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                          <ImagePlus size={13} className="text-gray-600" />
                        </span>
                      )}
                      <span className="truncate">{g.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{stepCount(g)}</td>
                  <td className="p-3">
                    <Badge variant={badge} className="!inline-flex items-center gap-1">
                      <CategoryIcon size={11} /> {g.category}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-400">{g.order}</td>
                  <td className="p-3 text-xs">
                    <Badge variant={g.isPublished ? 'green' : 'yellow'}>
                      {g.isPublished ? 'published' : 'draft'}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{formatDate(g.updatedAt)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(g)}>Edit</Button>
                      <Button
                        variant="secondary" size="sm"
                        icon={g.isPublished ? EyeOff : Eye}
                        onClick={() => togglePublish(g)}
                      >
                        {g.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(g)}>Delete</Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Guide Entry' : 'Add Guide Entry'} size="xl">
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {imageError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {imageError}
            </div>
          )}

          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. How to create a project"
          />

          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          {/* Steps builder — each step is its own text + optional picture,
              instead of one big content textarea. Click "Add Step" to append
              another one; a guide with 4 steps is 4 of these in a row. */}
          <div className="space-y-3">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Steps</label>

            {form.steps.map((step, i) => (
              <div key={i} className="rounded-xl border border-[var(--pms-bg-header)] bg-[var(--pms-bg-inset)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wide">
                    <GripVertical size={13} className="text-gray-600" /> Step {i + 1}
                  </span>
                  {form.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-gray-500 hover:text-red-400 transition cursor-pointer"
                      title="Remove step"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <Textarea
                  rows={2}
                  value={step.text}
                  onChange={(e) => updateStep(i, { text: e.target.value })}
                  placeholder={`Describe step ${i + 1}...`}
                />

                {step.image ? (
                  <div className="relative w-full max-w-[200px] rounded-lg overflow-hidden border border-[var(--pms-bg-header)] group">
                    <img src={step.image} alt={`Step ${i + 1} illustration`} className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => updateStep(i, { image: null })}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition cursor-pointer"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepFileRefs.current[i]?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
                    >
                      Change image
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => stepFileRefs.current[i]?.click()}
                    className="w-full max-w-[200px] h-16 rounded-lg border-2 border-dashed border-[var(--pms-bg-header)] hover:border-purple-500/60 transition cursor-pointer flex items-center justify-center gap-2 bg-[var(--pms-bg-surface)]"
                  >
                    <ImagePlus size={16} className="text-gray-500" />
                    <Text size="text-xs" color="text-gray-500">Add picture</Text>
                  </div>
                )}
                <input
                  ref={(el) => { stepFileRefs.current[i] = el; }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleStepImagePick(i, e)}
                  className="hidden"
                />
              </div>
            ))}

            <Button variant="secondary" size="sm" icon={Plus} onClick={addStep} className="w-full justify-center">
              Add Step
            </Button>
          </div>

          <div className="flex items-center gap-6">
            <Input
              label="Display order"
              type="number"
              value={form.order}
              onChange={(e) => setForm(prev => ({ ...prev, order: Number(e.target.value) }))}
              className="!w-28"
            />
            <label className="flex items-center gap-2 text-sm text-gray-300 mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="accent-purple-600"
              />
              Published (visible to users)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Entry'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminGuideHelp;