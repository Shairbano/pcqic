import { useState } from 'react';
import api from '../utils/api';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Modal from './ui/Model';

const initialForm = {
  adminId: '',
  senderName: '',
  senderEmail: '',
  subject: '',
  message: '',
};

const ContactAdminModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const handleOpen = () => {
    setIsModalOpen(true);
    setFeedback({ type: '', msg: '' });
    setLoadingAdmins(true);
    api.get('/public/admins')
      .then((res) => {
        const list = res.data.admins ?? [];
        setAdmins(list);
        setFormData((prev) => ({ ...prev, adminId: prev.adminId || list[0]?._id || '' }));
      })
      .catch(() => setFeedback({ type: 'err', msg: 'Could not load admins.' }))
      .finally(() => setLoadingAdmins(false));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (feedback.msg) setFeedback({ type: '', msg: '' });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setFeedback({ type: '', msg: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: '', msg: '' });

    try {
      await api.post('/public/contact-admin', formData);
      setFeedback({ type: 'ok', msg: 'Message sent to selected admin.' });
      setFormData((prev) => ({
        ...initialForm,
        adminId: prev.adminId,
      }));
    } catch (error) {
      setFeedback({
        type: 'err',
        msg: error.response?.data?.message || 'Failed to send message.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={handleOpen}>
        Contact Admin
      </Button>

      <Modal isOpen={isModalOpen} onClose={handleClose} title="Contact Admin" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {feedback.msg && (
            <div className={`text-sm p-3 rounded-lg border ${
              feedback.type === 'ok'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {feedback.msg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Select Admin</label>
            <select
              name="adminId"
              required
              value={formData.adminId}
              onChange={handleInputChange}
              disabled={loadingAdmins || admins.length === 0}
              className="w-full bg-[var(--pms-bg-inset)] border border-[var(--pms-bg-header)] rounded-lg py-2.5 px-4 text-white text-sm focus:border-purple-500 outline-none transition disabled:opacity-50"
            >
              {loadingAdmins && <option value="">Loading admins...</option>}
              {!loadingAdmins && admins.length === 0 && <option value="">No admins found</option>}
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Your name"
            name="senderName"
            value={formData.senderName}
            onChange={handleInputChange}
            placeholder="Your name"
          />
          <Input
            label="Your email"
            name="senderEmail"
            type="email"
            required
            value={formData.senderEmail}
            onChange={handleInputChange}
            placeholder="name@example.com"
          />
          <Input
            label="Subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Message subject"
          />
          <Textarea
            label="Message"
            name="message"
            rows={4}
            required
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Write your message..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Close
            </Button>
            <Button type="submit" loading={submitting} disabled={admins.length === 0}>
              {submitting ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ContactAdminModal;