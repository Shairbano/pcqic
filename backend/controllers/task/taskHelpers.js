const User        = require('../../models/user');
const Task        = require('../../models/Task');
const Notification = require('../../models/Notification');
const ProjectStatusHistory = require('../../models/ProjectStatusHistory');
const mongoose     = require('mongoose');
async function notifyAdmins({ actorId, type, message, contextId, contextType }) {
  const admins = await User.find({ role: 'admin', archiveState: { $ne: 'trash' } }).select('_id');
  await Promise.all(
    admins
      .filter(a => a._id.toString() !== actorId?.toString())
      .map(a => Notification.create({ recipientId: a._id, type, message, contextId, contextType }))
  );
}

const WORKFLOW_STAGES = ['pending', 'initiated', 'in_design', 'design_progress_phase', 'progress', 'finalization', 'acceptance', 'completed'];

// Feature #13 — stage is driven off how much weight has been ASSIGNED to
// tasks so far (not how much of that work is complete). Bands as specified:
//   0 tasks                        -> pending
//   >=1 task created               -> initiated
//   20% <= weight < 40%            -> in_design
//   40% <= weight < 50%            -> design_progress_phase
//   50% <= weight < 60%            -> finalization
//   60% <= weight < 90%            -> acceptance
//   weight == 100%                 -> completed
function progressBandStage(totalWeightAssigned, taskCount) {
  if (taskCount <= 0) return 'pending';
  if (totalWeightAssigned >= 100) return 'completed';
  if (totalWeightAssigned >= 60)  return 'acceptance';
  if (totalWeightAssigned >= 50)  return 'finalization';
  if (totalWeightAssigned >= 40)  return 'design_progress_phase';
  if (totalWeightAssigned >= 20)  return 'in_design';
  return 'initiated';
}

// Recompute the project's overall progress and, if warranted, auto-advance
// its workflowStage forward (never backward, and never past 'completed').
async function maybeAdvanceWorkflowStage(project, actorId) {
  // Feature #13b — once the admin has locked the design phase (no more
  // tasks will be added), the stage is no longer driven by weight bands;
  // leave it exactly where the admin action put it.
  if (project.designPhaseLocked) return;

  const tasks = await Task.find({ projectId: project._id, archiveState: { $nin: ['trash', 'locked'] } })
    .select('weightPercent progress');

  const totalWeightAssigned = tasks.reduce((sum, t) => sum + (t.weightPercent || 0), 0);

  const targetStage = progressBandStage(totalWeightAssigned, tasks.length);

  const currentIndex = WORKFLOW_STAGES.indexOf(project.workflowStage);
  const targetIndex  = WORKFLOW_STAGES.indexOf(targetStage);
  if (targetIndex <= currentIndex) return; // never auto-move backward or sideways

  const previousStatus = project.workflowStage;
  project.workflowStage = targetStage;
  await project.save();

  await ProjectStatusHistory.create({
    projectId: project._id, previousStatus, newStatus: targetStage, changedBy: actorId,
    remarks: `Auto-advanced: ${totalWeightAssigned}% weight assigned across ${tasks.length} task(s)`,
  });
}

function getTaskAccessLevel(group, userId) {
  if (group.isGroupHead(userId)) return 1;
  const member = group.getMember(userId);
  if (member && member.status === 'accepted') return 0;
  return -1;
}

function isValidObjectId(id) {
  return id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id);
}

// Feature #9 — find this user's own entry in task.assignees (ignoring ones
// who have already left, Feature #11).
function findAssigneeEntry(task, userId) {
  const uidStr = userId?.toString();
  return (task.assignees || []).find(a => !a.leftAt && a.userId?.toString() === uidStr);
}

// Feature #6 — figure out the next version number for a file being replaced.
// Scans every history entry's files for ones sharing the same fileGroupId.
function nextFileVersion(task, fileGroupId) {
  let maxVersion = 0;
  let originalUploader = null;
  for (const h of task.history || []) {
    for (const f of h.files || []) {
      if (f.fileGroupId === fileGroupId) {
        if (f.version > maxVersion) maxVersion = f.version;
        if (f.version === 1) originalUploader = f.uploadedBy;
      }
    }
  }
  return { nextVersion: maxVersion + 1, originalUploader };
}

// Map history entries: rename actorId → actor so frontend gets { actor: { name } }
function shapeTask(task, access_level) {
  const history = (task.history ?? []).map(h => ({
    _id:       h._id,
    action:    h.action,
    note:      h.note,
    progress:  h.progress,
    files:     h.files,
    timestamp: h.timestamp,
    createdAt: h.timestamp,
    // populated actorId becomes actor for the frontend
    actor:     h.actorId ?? null,
    actorId:   h.actorId ?? null,
    forwardedTo: h.forwardedTo ?? null,
  }));

  return {
    _id:         task._id,
    title:       task.title,
    description: task.description,
    projectId:   task.projectId,
    groupId:     task.groupId,
    assignedTo:  task.assignedTo,          // legacy, primary assignee — always kept in sync
    assignees:   task.assignees ?? [],     // Feature #9 — full per-member status/progress
    status:      task.status,
    progress:    task.progress,
    weightPercent: task.weightPercent ?? 0, // Feature #12
    deadline:    task.deadline,
    visibility:  task.visibility ?? 'group',
    archiveState: task.archiveState,
    createdBy:   task.createdBy,
    createdAt:   task.createdAt,
    history,
    access_level,
  };
}

module.exports = {
  notifyAdmins,
  WORKFLOW_STAGES,
  progressBandStage,
  maybeAdvanceWorkflowStage,
  getTaskAccessLevel,
  isValidObjectId,
  findAssigneeEntry,
  nextFileVersion,
  shapeTask,
};