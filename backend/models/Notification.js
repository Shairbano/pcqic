
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'group_invite',
      'task_assigned',
      'task_created',
      'group_approved',
      'group_rejected',
      'project_approved',
      'project_rejected',
      'task_update',
      'admin_contact',
      'unlock_request',
      'group_locked',
      'group_released',
      'member_locked',
      'member_unlocked',
      'project_paused',
    ],
    required: true,
  },
  message:     { type: String, required: true },
  senderName:  { type: String },
  senderEmail: { type: String },
  subject:     { type: String },
  body:        { type: String },
  read:        { type: Boolean, default: false },
  // Soft-delete: a "deleted" message is moved to trash rather than removed
  // outright, matching how locked groups/projects and trashed tasks/users work.
  archiveState: { type: String, enum: ['active', 'trash'], default: 'active' },
  archivedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt:   { type: Date },
  // contextId: the _id of the related resource (group, task, project)
  contextId:   { type: mongoose.Schema.Types.ObjectId },
  contextType: { type: String, enum: ['Group', 'Project', 'Task', 'Contact'] },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);