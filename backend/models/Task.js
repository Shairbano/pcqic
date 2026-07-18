const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  data:       { type: String, required: true }, // base64 encoded
  mimeType:   { type: String, required: true },
  size:       { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Feature #6 — File Versioning. Files sharing the same fileGroupId are
  // versions of the "same" document; version 1 is the original, later
  // versions are added (never overwritten) when the uploader replaces it.
  fileGroupId:  { type: String },  // groups versions of the same logical document
  version:      { type: Number, default: 1 },
  changeNotes:  { type: String }, // optional note on what changed in this version
  accessibility: { type: String, enum: ['private', 'group', 'project', 'public'], default: 'private' },
  uploadedAt: { type: Date, default: Date.now },
});

const historySchema = new mongoose.Schema({
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:    {
    type: String,
    enum: ['created', 'assigned', 'accepted', 'rejected', 'forwarded', 'updated', 'completed', 'left'],
    required: true,
  },
  note:        { type: String },
  progress:    { type: Number, min: 0, max: 100 },
  forwardedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  files:       [fileSchema], // files attached to this history entry (task creation or update)
  timestamp:   { type: Date, default: Date.now },
});

// Feature #9 — Multiple Members on Same Task. Each assignee tracks their
// OWN status/progress independently, so two people can work the same task
// without stepping on each other. task.assignedTo/status/progress (below)
// are kept as an aggregate view for backward compatibility with any older
// code that only knows about a single assignee.
const assigneeSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed'], default: 'pending' },
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  joinedAt:    { type: Date, default: Date.now },
  // Feature #11 — Leave Task Midway
  leftAt:      { type: Date },
  leaveReason: { type: String },
});

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Legacy single-assignee field — always kept in sync as the FIRST active
  // entry in `assignees` below, so any existing code reading assignedTo
  // directly (TaskCard, Reports, My Tasks, notifications) keeps working.
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Feature #9 — full list of people actively working this task.
  assignees:   [assigneeSchema],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'forwarded', 'in_progress', 'completed'],
    default: 'pending',
  },
  progress:  { type: Number, default: 0, min: 0, max: 100 },
  // Feature #12 — this task's share of the PROJECT's overall progress.
  // e.g. Task A = 20, Task B = 15, Task C = 30 — must not exceed 100 total
  // across all active tasks in the same project (enforced in taskController).
  weightPercent: { type: Number, default: 0, min: 0, max: 100 },
  deadline:  { type: Date },
  // Who can see this task: 'private' — only its assignees (plus the group
  // head/admin, who can always see everything) — or 'group' — every group
  // member. Defaults to 'group' so existing behavior (everyone sees every
  // task) doesn't change unless someone opts a task into 'private'.
  visibility: { type: String, enum: ['private', 'group'], default: 'group' },
  archiveState: { type: String, enum: ['active', 'trash', 'locked'], default: 'active' },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt: { type: Date },
  history:   [historySchema],
}, { timestamps: true });

// Add indexes for better query performance
taskSchema.index({ projectId: 1 });
taskSchema.index({ groupId: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ 'assignees.userId': 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ archiveState: 1 });
taskSchema.index({ projectId: 1, archiveState: 1 });
taskSchema.index({ assignedTo: 1, archiveState: 1 });

// Recomputes the aggregate assignedTo/status/progress fields from the
// per-member `assignees` array. Call this after any change to `assignees`.
taskSchema.methods.recomputeAggregate = function () {
  // "Present" = still actually on the task (hasn't left — rejecting is not
  // the same as leaving, a rejected slot is still present until reassigned
  // or explicitly left).
  const notLeft = this.assignees.filter(a => !a.leftAt);

  // Defensive de-duplication: if the same person somehow ends up with more
  // than one non-left entry (e.g. forwarded the task again while an older
  // entry for them was still sitting there), only their single most-advanced
  // entry should count. Without this, a real completed entry could get
  // silently averaged down by a stale duplicate that never did any work —
  // which is exactly the "stuck at 50%" symptom this guards against.
  const rank = { completed: 4, in_progress: 3, accepted: 2, pending: 1, rejected: 0 };
  const byUser = new Map();
  for (const a of notLeft) {
    const uid = a.userId?.toString();
    if (!uid) continue;
    const existing = byUser.get(uid);
    if (!existing || (rank[a.status] ?? 0) > (rank[existing.status] ?? 0)) {
      byUser.set(uid, a);
    }
  }
  const present = [...byUser.values()];

  // Prefer a non-rejected entry for the legacy single-assignee field, so it
  // doesn't keep pointing at someone who already rejected once a real
  // assignee (or a reassigned/reactivated one) is present.
  this.assignedTo = present.find(a => a.status !== 'rejected')?.userId ?? present[0]?.userId ?? undefined;

  if (present.length === 0) {
    return; // nothing left assigned — leave status/progress as they are
  }
  const allCompleted = present.every(a => a.status === 'completed');
  const allRejected   = present.every(a => a.status === 'rejected');
  // Anyone who has accepted, is actively working, OR has already finished
  // their own share counts as "real work has happened" — without including
  // 'completed' here, a task with one assignee done and another still
  // pending would incorrectly fall all the way back to 'pending' overall,
  // even though real progress clearly occurred.
  const anyActiveWork = present.some(a => ['accepted', 'in_progress', 'completed'].includes(a.status));

  this.status = allCompleted ? 'completed' : allRejected ? 'rejected' : anyActiveWork ? 'in_progress' : 'pending';

  // Progress average excludes rejected slots — a rejected assignment isn't
  // "0% progress on real work", it's an empty slot waiting to be
  // reassigned; counting it would incorrectly drag down everyone else's
  // real progress.
  const counted = present.filter(a => a.status !== 'rejected');
  this.progress = counted.length
    ? Math.round(counted.reduce((sum, a) => sum + (a.progress || 0), 0) / counted.length)
    : 0;
};

module.exports = mongoose.model('Task', taskSchema);