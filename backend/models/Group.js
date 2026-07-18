const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:        { type: String, enum: ['head', 'admin', 'member'], default: 'member' },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected', 'removed'], default: 'pending' },
  source:      { type: String, enum: ['invite', 'join_request'], default: 'join_request' },
  joinedAt:    { type: Date },
  respondedAt: { type: Date },
  rejectedAt:  { type: Date }, // Track when user was rejected for 3-day cooldown
  reason:      { type: String },
  locked:       { type: Boolean, default: false },
  lockedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt:     { type: Date },
  lockReason:   { type: String },
  removedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  removedAt:    { type: Date },
});

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  coverPhoto:  { type: String },
  coverPosition: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
  },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // groupHead = the owner with full control (always the creator)
  groupHead:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // 'pending'  = waiting for org-admin approval (employee-created only)
  // 'active'   = approved and running
  // 'rejected' = org-admin rejected it
  status:      { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
  archiveState: { type: String, enum: ['active', 'trash', 'locked'], default: 'active' },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt: { type: Date },
  members:     [memberSchema],
  adminNote:   { type: String },
}, { timestamps: true });

// Is this userId the group head (owner)?
groupSchema.methods.isGroupHead = function (userId) {
  if (!userId) return false;
  const targetId = userId._id ? userId._id.toString() : userId.toString();

  // Check groupHead field first
  if (this.groupHead) {
    const headId = this.groupHead._id ? this.groupHead._id.toString() : this.groupHead.toString();
    if (headId === targetId) return true;
  }

  // Fallback: check createdBy
  if (this.createdBy) {
    const creatorId = this.createdBy._id ? this.createdBy._id.toString() : this.createdBy.toString();
    if (creatorId === targetId) return true;
  }

  // Fallback: check members with role 'head' or 'admin'
  const m = this.members.find(m => {
    if (!m?.userId) return false;
    const memberId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    return memberId === targetId && (m.role === 'head' || m.role === 'admin');
  });
  return !!m;
};

// Legacy alias
groupSchema.methods.isGroupAdmin = function (userId) {
  return this.isGroupHead(userId);
};

groupSchema.methods.isAcceptedMember = function (userId) {
  if (!userId) return false;
  const targetId = userId._id ? userId._id.toString() : userId.toString();
  const m = this.members.find(m => {
    if (!m?.userId) return false;
    const memberId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    return memberId === targetId;
  });
  return !!(m && m.status === 'accepted');
};

groupSchema.methods.getMember = function (userId) {
  if (!userId) return undefined;
  const targetId = userId._id ? userId._id.toString() : userId.toString();
  return this.members.find(m => {
    if (!m?.userId) return false;
    const memberId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    return memberId === targetId;
  });
};

// Add indexes for better query performance
groupSchema.index({ createdBy: 1 });
groupSchema.index({ groupHead: 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ archiveState: 1 });
groupSchema.index({ 'members.userId': 1, 'members.status': 1 });
groupSchema.index({ createdBy: 1, status: 1 });
groupSchema.index({ groupHead: 1, archiveState: 1 });

module.exports = mongoose.model('Group', groupSchema);