const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  data:      { type: String, required: true }, // base64 encoded
  mimeType:  { type: String, required: true },
  size:      { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Feature #6 — File Versioning. Entries sharing the same fileGroupId are
  // versions of the same logical document; version 1 is the original.
  // Replacing a file NEVER overwrites — it appends a new version here.
  fileGroupId: { type: String },
  version:     { type: Number, default: 1 },
  changeNotes: { type: String },
  // Feature #7 — Default Accessibility for documents.
  accessibility: { type: String, enum: ['private', 'group', 'project', 'public'], default: 'private' },
  uploadedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:      {
    type: String,
    enum: ['pending', 'active', 'rejected', 'completed'],
    default: 'active',
  },
  workflowStage: {
    type: String,
    enum: ['pending', 'initiated', 'in_design', 'design_progress_phase', 'progress', 'finalization', 'acceptance', 'completed'],
    default: 'pending',
  },
  isPaused:    { type: Boolean, default: false },
  // Feature #13b — admin can declare "no more tasks will be added"; once
  // true, task creation is blocked and the auto weight-band advancement
  // in taskHelpers.js stops moving the stage on its own.
  designPhaseLocked: { type: Boolean, default: false },
  // Feature #7 — Default Accessibility for Projects. Project Head can change
  // this according to role permissions (enforced in projectController).
  accessibility: { type: String, enum: ['private', 'group', 'public'], default: 'private' },
  deadline:    { type: Date },
  archiveState: { type: String, enum: ['active', 'trash', 'locked'], default: 'active' },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt: { type: Date },
  adminNote:   { type: String },
  files:       [fileSchema], // attachments uploaded during project creation or later
}, { timestamps: true });

// Add indexes for better query performance
projectSchema.index({ groupId: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ archiveState: 1 });
projectSchema.index({ groupId: 1, archiveState: 1 });

module.exports = mongoose.model('Project', projectSchema);