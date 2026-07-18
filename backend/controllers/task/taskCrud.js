const Task         = require('../../models/Task');
const Project      = require('../../models/Project');
const Group        = require('../../models/Group');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const TechnicalLog  = require('../../models/TechnicalLog');
const ProjectStatusHistory = require('../../models/ProjectStatusHistory');
const crypto        = require('crypto');
const asyncHandler  = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE } = require('./taskConstants');
const { notifyAdmins, getTaskAccessLevel, isValidObjectId, shapeTask, maybeAdvanceWorkflowStage } = require('./taskHelpers');

// POST .../tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, additionalAssignees, deadline, files, weightPercent, visibility } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
  if (visibility && !['private', 'group'].includes(visibility))
    return res.status(400).json({ success: false, message: 'Invalid visibility value' });

  if (!isValidObjectId(req.params.groupId) || !isValidObjectId(req.params.projectId))
    return res.status(400).json({ success: false, message: 'Invalid group or project ID' });

  const group   = await Group.findOne({ _id: req.params.groupId, archiveState: { $ne: 'locked' } });
  const project = await Project.findOne({ _id: req.params.projectId, groupId: req.params.groupId, archiveState: { $ne: 'locked' } });
  if (!group || !project)
    return res.status(404).json({ success: false, message: 'Group or Project not found' });

  const access_level = getTaskAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the group head can create tasks' });

  // Feature #13b — admin has declared the design phase closed; no more
  // tasks may be added to this project.
  if (project.designPhaseLocked)
    return res.status(400).json({ success: false, message: 'This project\'s design phase is closed — no more tasks can be added.' });

  // Feature #9 — collect every distinct assignee (primary + additional)
  const assigneeIds = [
    ...(assignedTo ? [assignedTo] : []),
    ...(Array.isArray(additionalAssignees) ? additionalAssignees : []),
  ].filter((id, i, arr) => id && arr.indexOf(id) === i); // de-dupe, drop falsy

  for (const uid of assigneeIds) {
    const member = group.getMember(uid);
    if (!member || member.status !== 'accepted')
      return res.status(400).json({ success: false, message: `Assignee ${uid} is not an active group member` });
  }

  // Feature #12 — weightPercent is mandatory: every task must carry a real
  // share of the project's progress, and must not push the project's
  // total over 100%.
  if (weightPercent === undefined || weightPercent === null || weightPercent === '')
    return res.status(400).json({ success: false, message: 'A weight percentage is required for every task' });
  const weight = Number(weightPercent);
  if (Number.isNaN(weight) || weight <= 0 || weight > 100)
    return res.status(400).json({ success: false, message: 'weightPercent must be greater than 0 and at most 100' });
  const existingTasks = await Task.find({ projectId: project._id, ...ACTIVE_ARCHIVE }).select('weightPercent');
  const alreadyAssigned = existingTasks.reduce((sum, t) => sum + (t.weightPercent || 0), 0);
  if (alreadyAssigned + weight > 100) {
    return res.status(400).json({
      success: false,
      message: `This project's tasks already total ${alreadyAssigned}% — adding ${weight}% would exceed 100%. ${100 - alreadyAssigned}% is available.`,
    });
  }

  const attachedFiles = [];
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.name && f.data && f.mimeType)
        attachedFiles.push({
          name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
          uploadedBy: req.user._id,
          fileGroupId: crypto.randomUUID(), version: 1, // Feature #6 — every new file starts at v1
          accessibility: f.accessibility || 'private',   // Feature #7
        });
    }
  }

  const assigneeName = assignedTo
    ? (await require('../../models/user').findById(assignedTo).select('name'))?.name ?? assignedTo
    : 'unassigned';

  const task = await Task.create({
    title, description,
    projectId:  project._id,
    groupId:    group._id,
    createdBy:  req.user._id,
    assignedTo: assigneeIds[0] || undefined, // legacy/primary
    assignees:  assigneeIds.map(uid => ({ userId: uid, status: 'pending', progress: 0 })),
    status:     'pending',
    weightPercent: weight,
    deadline:   deadline || undefined,
    visibility: visibility || 'group',
    history: [{
      actorId:   req.user._id,
      action:    'created',
      note:      assigneeIds.length > 1
        ? `Task created and assigned to ${assigneeIds.length} members`
        : `Task created and assigned to ${assigneeName}`,
      files:     attachedFiles,
      timestamp: new Date(),
    }],
  });

  for (const uid of assigneeIds) {
    await Notification.create({
      recipientId: uid,
      type:        'task_assigned',
      message:     `You have been assigned a new task: "${title}" in project "${project.name}"`,
      contextId:   task._id,
      contextType: 'Task',
    });
  }

  await notifyAdmins({
    actorId: req.user._id, type: 'task_created',
    message: `${req.user.name} created task "${title}" in project "${project.name}"`,
    contextId: task._id, contextType: 'Task',
  });

  if (project.workflowStage === 'pending') {
    const previousStatus = project.workflowStage;
    project.workflowStage = 'initiated';
    await project.save();
    await ProjectStatusHistory.create({
      projectId: project._id, previousStatus, newStatus: 'initiated', changedBy: req.user._id,
      remarks: 'Auto-advanced: first task created',
    });
  }
  await maybeAdvanceWorkflowStage(project, req.user._id);

  // Creations go to the Technical Log, not the Management Log — see
  // models/TechnicalLog.js for the reasoning.
  await TechnicalLog.log({
    level: 'info', type: 'create_task', userId: req.user._id,
    endpoint: req.originalUrl, method: req.method, statusCode: 201,
    message: `Created task "${title}" in project "${project.name}"`,
  });
  return res.status(201).json({ success: true, message: 'Task created', task });
});

// GET .../tasks
const listTasks = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.groupId) || !isValidObjectId(req.params.projectId))
    return res.status(400).json({ success: false, message: 'Invalid group or project ID' });

  const group   = await Group.findOne({ _id: req.params.groupId, archiveState: { $ne: 'locked' } }).select('_id members groupHead createdBy');
  const project = await Project.findOne({ _id: req.params.projectId, groupId: req.params.groupId, archiveState: { $ne: 'locked' } }).select('_id groupId');
  if (!group || !project)
    return res.status(404).json({ success: false, message: 'Group or Project not found' });

  const access_level  = getTaskAccessLevel(group, req.user._id);
  const isSystemAdmin = req.user.role === 'admin';
  if (access_level === -1 && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Access denied' });

  const effectiveLevel = (access_level === -1 && isSystemAdmin) ? 0 : access_level;
  const myId = req.user._id.toString();
  const canSeeEverything = effectiveLevel === 1 || isSystemAdmin;

  const tasks = await Task.find({ projectId: project._id, ...ACTIVE_ARCHIVE })
    .select('title description projectId groupId createdBy assignedTo assignees status progress weightPercent deadline visibility archiveState history')
    .populate('assignedTo', 'name email')
    .populate('assignees.userId', 'name email')
    .populate('createdBy', 'name email')
    .populate('history.actorId', 'name email')
    .populate('history.forwardedTo', 'name email')
    .sort({ createdAt: -1 });

  const visibleTasks = canSeeEverything
    ? tasks
    : tasks.filter(t => {
        if (t.visibility !== 'private') return true;
        return (t.assignees || []).some(a => (a.userId?._id ?? a.userId)?.toString() === myId);
      });

  return res.status(200).json({ success: true, tasks: visibleTasks.map(t => shapeTask(t, effectiveLevel)), access_level: effectiveLevel });
});

// GET .../tasks/:taskId
const getTask = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.groupId) || !isValidObjectId(req.params.projectId) || !isValidObjectId(req.params.taskId))
    return res.status(400).json({ success: false, message: 'Invalid group, project, or task ID' });

  const group   = await Group.findOne({ _id: req.params.groupId, archiveState: { $ne: 'locked' } }).select('_id members groupHead createdBy');
  const project = await Project.findOne({ _id: req.params.projectId, groupId: req.params.groupId, archiveState: { $ne: 'locked' } }).select('_id groupId');
  if (!group || !project)
    return res.status(404).json({ success: false, message: 'Group or Project not found' });

  const task = await Task.findOne({ _id: req.params.taskId, projectId: project._id, ...ACTIVE_ARCHIVE })
    .select('title description projectId groupId createdBy assignedTo assignees status progress weightPercent deadline visibility archiveState history')
    .populate('assignedTo', 'name email')
    .populate('assignees.userId', 'name email')
    .populate('createdBy', 'name email')
    .populate('history.actorId', 'name email')
    .populate('history.forwardedTo', 'name email');
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const access_level  = getTaskAccessLevel(group, req.user._id);
  const isSystemAdmin = req.user.role === 'admin';
  if (access_level === -1 && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Access denied' });

  const effectiveLevel = (access_level === -1 && isSystemAdmin) ? 0 : access_level;
  const canSeeEverything = effectiveLevel === 1 || isSystemAdmin;
  if (!canSeeEverything && task.visibility === 'private') {
    const myId = req.user._id.toString();
    const isMyTask = (task.assignees || []).some(a => a.userId?._id?.toString() === myId || a.userId?.toString() === myId);
    if (!isMyTask) return res.status(403).json({ success: false, message: 'This task is private.' });
  }

  return res.status(200).json({ success: true, task: shapeTask(task, effectiveLevel) });
});

// DELETE .../tasks/:taskId
const deleteTask = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.groupId) || !isValidObjectId(req.params.projectId) || !isValidObjectId(req.params.taskId))
    return res.status(400).json({ success: false, message: 'Invalid group, project, or task ID' });

  const group   = await Group.findOne({ _id: req.params.groupId, archiveState: { $ne: 'locked' } });
  const project = await Project.findOne({ _id: req.params.projectId, groupId: req.params.groupId, archiveState: { $ne: 'locked' } });
  if (!group || !project)
    return res.status(404).json({ success: false, message: 'Group or Project not found' });

  const task = await Task.findOne({ _id: req.params.taskId, projectId: project._id, ...ACTIVE_ARCHIVE });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const access_level = getTaskAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the group head can delete tasks' });

  task.archiveState = 'trash';
  task.archivedBy = req.user._id;
  task.archivedAt = new Date();
  await task.save();

  await AuditLog.log({ actorId: req.user._id, action: 'delete_task', targetType: 'Task', targetId: task._id, detail: `Moved task "${task.title}" to trash` });
  return res.status(200).json({ success: true, message: 'Task moved to trash' });
});

module.exports = { createTask, listTasks, getTask, deleteTask };