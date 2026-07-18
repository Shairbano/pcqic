const Task         = require('../../models/Task');
const Project      = require('../../models/Project');
const Group        = require('../../models/Group');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const crypto        = require('crypto');
const asyncHandler  = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE } = require('./taskConstants');
const {
  notifyAdmins, getTaskAccessLevel, isValidObjectId,
  findAssigneeEntry, nextFileVersion, shapeTask, maybeAdvanceWorkflowStage,
} = require('./taskHelpers');

// PATCH .../tasks/:taskId/action
const taskAction = asyncHandler(async (req, res) => {
  const { action, note, progress, forwardedTo, files, leaveReason } = req.body;
  const validActions = ['accept', 'reject', 'forward', 'update', 'leave'];
  if (!validActions.includes(action))
    return res.status(400).json({ success: false, message: `Action must be one of: ${validActions.join(', ')}` });

  if (!isValidObjectId(req.params.groupId) || !isValidObjectId(req.params.projectId) || !isValidObjectId(req.params.taskId))
    return res.status(400).json({ success: false, message: 'Invalid group, project, or task ID' });

  const group   = await Group.findOne({ _id: req.params.groupId, archiveState: { $ne: 'locked' } });
  const project = await Project.findOne({ _id: req.params.projectId, groupId: req.params.groupId, archiveState: { $ne: 'locked' } });
  if (!group || !project)
    return res.status(404).json({ success: false, message: 'Group or Project not found' });

  const task = await Task.findOne({ _id: req.params.taskId, projectId: project._id, ...ACTIVE_ARCHIVE });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const access_level = getTaskAccessLevel(group, req.user._id);
  if (access_level === -1)
    return res.status(403).json({ success: false, message: 'Access denied' });

  // Feature #9 — per-member entry (falls back to the legacy single-assignee
  // check if this task predates the assignees array, e.g. old data)
  const myEntry    = findAssigneeEntry(task, req.user._id);
  const isAssignee = !!myEntry || (task.assignees?.length === 0 && task.assignedTo?.toString() === req.user._id.toString());
  const isGroupHead = access_level === 1;

  const attachedFiles = [];
  if (Array.isArray(files)) {
    for (const f of files) {
      if (!f.name || !f.data || !f.mimeType) continue;
      if (f.fileGroupId) {
        // Feature #6 — this is a new VERSION of an existing file, not a new file
        const { nextVersion, originalUploader } = nextFileVersion(task, f.fileGroupId);
        const isOriginalUploader = originalUploader?.toString() === req.user._id.toString();
        if (!isOriginalUploader && !isGroupHead) {
          return res.status(403).json({ success: false, message: 'Only the original uploader or the group head can upload a new version of this file' });
        }
        attachedFiles.push({
          name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
          uploadedBy: req.user._id,
          fileGroupId: f.fileGroupId, version: nextVersion, changeNotes: f.changeNotes || '',
          accessibility: f.accessibility || 'private',
        });
      } else {
        attachedFiles.push({
          name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
          uploadedBy: req.user._id,
          fileGroupId: crypto.randomUUID(), version: 1,
          accessibility: f.accessibility || 'private',
        });
      }
    }
  }

  if (action === 'accept') {
    if (!isAssignee) return res.status(403).json({ success: false, message: 'Only an assignee can accept this task' });
    if (myEntry) {
      if (myEntry.status !== 'pending') return res.status(400).json({ success: false, message: 'You are not in a pending state on this task' });
      myEntry.status = 'accepted';
      task.markModified('assignees');
      task.recomputeAggregate();
    } else if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Task is not in pending state' });
    } else {
      task.status = 'accepted';
    }
    task.history.push({ actorId: req.user._id, action: 'accepted', note, files: attachedFiles, timestamp: new Date() });
    if (task.createdBy.toString() !== req.user._id.toString()) {
      await Notification.create({ recipientId: task.createdBy, type: 'task_update', message: `Task "${task.title}" was accepted by ${req.user.name}.`, contextId: task._id, contextType: 'Task' });
    }
    await notifyAdmins({
      actorId: req.user._id, type: 'task_update',
      message: `${req.user.name} accepted task "${task.title}"`,
      contextId: task._id, contextType: 'Task',
    });
  }
  else if (action === 'reject') {
    if (!isAssignee) return res.status(403).json({ success: false, message: 'Only an assignee can reject this task' });
    if (myEntry) {
      if (!['pending', 'accepted'].includes(myEntry.status)) return res.status(400).json({ success: false, message: 'You cannot reject this task at this stage' });
      myEntry.status = 'rejected';
      task.markModified('assignees');
      task.recomputeAggregate();
    } else if (!['pending', 'accepted'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Task cannot be rejected at this stage' });
    } else {
      task.status = 'rejected';
    }
    task.history.push({ actorId: req.user._id, action: 'rejected', note, files: attachedFiles, timestamp: new Date() });
    await Notification.create({ recipientId: task.createdBy, type: 'task_update', message: `Task "${task.title}" was rejected by ${req.user.name}. Reason: ${note || 'None'}`, contextId: task._id, contextType: 'Task' });
    await notifyAdmins({
      actorId: req.user._id, type: 'task_update',
      message: `${req.user.name} rejected task "${task.title}". Reason: ${note || 'None'}`,
      contextId: task._id, contextType: 'Task',
    });
  }
  else if (action === 'forward') {
    // Only the group head or the person who originally created the task
    // can forward it — the assignee can update/accept/reject/leave, but
    // not hand the task off to someone else themselves.
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    if (!isGroupHead && !isCreator) return res.status(403).json({ success: false, message: 'Only the group head or the task creator can forward a task' });
    if (!forwardedTo) return res.status(400).json({ success: false, message: 'forwardedTo is required for forward action' });
    const targetMember = group.getMember(forwardedTo);
    if (!targetMember || targetMember.status !== 'accepted') return res.status(400).json({ success: false, message: 'Target user is not an active group member' });

    task.history.push({ actorId: req.user._id, action: 'forwarded', note, forwardedTo, files: attachedFiles, timestamp: new Date() });

    if (myEntry) {
      // Feature #9 — only the forwarding person's own slot is replaced;
      // any other simultaneous assignees are untouched.
      myEntry.leftAt = new Date();
      myEntry.leaveReason = `Forwarded to another member${note ? `: ${note}` : ''}`;
      task.assignees.push({ userId: forwardedTo, status: 'pending', progress: 0 });
      task.markModified('assignees');
      task.recomputeAggregate();
    } else {
      if (!task.assignees) task.assignees = [];
      const existingEntry = task.assignees.find(a => a.userId?.toString() === forwardedTo.toString() && !a.leftAt);
      if (existingEntry) {
        existingEntry.status = 'pending';
        existingEntry.progress = 0;
      } else {
        task.assignees.push({ userId: forwardedTo, status: 'pending', progress: 0 });
      }
      task.markModified('assignees');
      task.recomputeAggregate();
    }

    await Notification.create({ recipientId: forwardedTo, type: 'task_assigned', message: `Task "${task.title}" has been forwarded to you.`, contextId: task._id, contextType: 'Task' });
    if (task.createdBy.toString() !== req.user._id.toString()) {
      await Notification.create({ recipientId: task.createdBy, type: 'task_update', message: `${req.user.name} forwarded task "${task.title}" to another member.`, contextId: task._id, contextType: 'Task' });
    }
    await notifyAdmins({
      actorId: req.user._id, type: 'task_update',
      message: `${req.user.name} forwarded task "${task.title}"`,
      contextId: task._id, contextType: 'Task',
    });
  }
  else if (action === 'update') {
    if (!isAssignee) return res.status(403).json({ success: false, message: 'Only an assigned person can update task progress' });
    const newProgress = progress !== undefined ? Number(progress) : (myEntry?.progress ?? task.progress);
    if (Number.isNaN(newProgress) || newProgress < 0 || newProgress > 100) return res.status(400).json({ success: false, message: 'Progress must be 0-100' });

    if (myEntry) {
      if (!['accepted', 'in_progress'].includes(myEntry.status)) return res.status(400).json({ success: false, message: 'You must accept this task before updating it' });
      myEntry.progress = newProgress;
      myEntry.status   = newProgress >= 100 ? 'completed' : 'in_progress';
      task.markModified('assignees');
      task.recomputeAggregate();
    } else {
      if (!['accepted', 'in_progress'].includes(task.status)) return res.status(400).json({ success: false, message: 'Task must be accepted before updating' });
      task.progress = newProgress;
      task.status   = newProgress >= 100 ? 'completed' : 'in_progress';
    }
    task.history.push({ actorId: req.user._id, action: (myEntry?.status ?? task.status) === 'completed' ? 'completed' : 'updated', note, progress: newProgress, files: attachedFiles, timestamp: new Date() });
    if (task.createdBy.toString() !== req.user._id.toString()) {
      await Notification.create({ recipientId: task.createdBy, type: 'task_update', message: `Task "${task.title}" updated to ${newProgress}% by ${req.user.name}. Note: ${note || 'No note'}`, contextId: task._id, contextType: 'Task' });
    }
    await notifyAdmins({
      actorId: req.user._id, type: 'task_update',
      message: `${req.user.name} updated task "${task.title}" to ${newProgress}%`,
      contextId: task._id, contextType: 'Task',
    });
  }
  else if (action === 'leave') {
    // Feature #11 — Leave Task Midway
    if (!isAssignee) return res.status(403).json({ success: false, message: 'You are not assigned to this task' });
    if (!leaveReason || !leaveReason.trim()) return res.status(400).json({ success: false, message: 'A reason is required to leave a task' });
    if (!myEntry) return res.status(400).json({ success: false, message: 'Legacy single-assignee tasks cannot be left this way — ask the group head to forward it instead' });

    myEntry.leftAt = new Date();
    myEntry.leaveReason = leaveReason.trim();
    task.markModified('assignees');
    task.recomputeAggregate(); // reassigns primary/status/progress from whoever remains, previous work history is untouched below

    task.history.push({ actorId: req.user._id, action: 'left', note: leaveReason.trim(), timestamp: new Date() });

    await Notification.create({
      recipientId: task.createdBy, // the project/group head who created the task
      type: 'task_update',
      message: `${req.user.name} left task "${task.title}" midway. Reason: ${leaveReason.trim()}`,
      contextId: task._id, contextType: 'Task',
    });
    await notifyAdmins({
      actorId: req.user._id, type: 'task_update',
      message: `${req.user.name} left task "${task.title}" midway. Reason: ${leaveReason.trim()}`,
      contextId: task._id, contextType: 'Task',
    });
  }

  await task.save();

  if (action === 'update') {
    await maybeAdvanceWorkflowStage(project, req.user._id);
  }

  // Re-fetch with populated history actors so the response has names
  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'name email')
    .populate('assignees.userId', 'name email')
    .populate('createdBy', 'name email')
    .populate('history.actorId', 'name email')
    .populate('history.forwardedTo', 'name email');

  await AuditLog.log({ actorId: req.user._id, action: `task_${action}`, targetType: 'Task', targetId: task._id, detail: `${req.user.name} performed '${action}' on task "${task.title}"` });
  return res.status(200).json({ success: true, message: `Task ${action} recorded`, task: shapeTask(populated, access_level) });
});

module.exports = { taskAction };