const Group               = require('../../models/Group');
const Project             = require('../../models/Project');
const User                = require('../../models/user');
const Notification        = require('../../models/Notification');
const AuditLog             = require('../../models/AuditLog');
const ProjectPauseHistory = require('../../models/ProjectPauseHistory');
const asyncHandler         = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE } = require('./projectConstants');
const { getProjectAccessLevel } = require('./projectHelpers');

// POST /api/group/:groupId/projects/:projectId/pause
const pauseProject = asyncHandler(async (req, res) => {
  const { pauseReason, description, expectedResolutionDate } = req.body;
  if (!pauseReason || !description)
    return res.status(400).json({ success: false, message: 'pauseReason and description are required' });

  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE });
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the project/group head can pause a project' });

  if (project.isPaused)
    return res.status(400).json({ success: false, message: 'Project is already paused' });

  project.isPaused = true;
  await project.save();

  const pauseRecord = await ProjectPauseHistory.create({
    projectId: project._id, pausedBy: req.user._id, pauseReason, description,
    expectedResolutionDate: expectedResolutionDate || undefined, status: 'open',
  });

  // Only notify other admins when a non-admin group head pauses a project
  // (i.e. it needs admin oversight/review). If an admin pauses their own
  // project, that's already an admin action — no need to broadcast the
  // reason to every other admin.
  if (req.user.role !== 'admin') {
    const admins = await User.find({ role: 'admin', archiveState: { $ne: 'trash' } }).select('_id');
    await Promise.all(admins.map(admin => Notification.create({
      recipientId: admin._id,
      type: 'project_paused',
      message: `${req.user.name} paused project "${project.name}" in group "${group.name}". Reason: ${pauseReason}`,
      contextId: project._id, contextType: 'Project',
    })));
  }

  await AuditLog.log({ actorId: req.user._id, action: 'pause_project', targetType: 'Project', targetId: project._id, detail: `Paused project "${project.name}": ${pauseReason}` });
  return res.status(200).json({ success: true, message: 'Project paused', pauseRecord });
});

// POST /api/group/:groupId/projects/:projectId/resume
const resumeProject = asyncHandler(async (req, res) => {
  const { resolvedSolution } = req.body;

  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE });
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  const isSystemAdmin = req.user.role === 'admin';
  if (access_level !== 1 && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Only the project head or an admin can resume a project' });

  if (!project.isPaused)
    return res.status(400).json({ success: false, message: 'Project is not currently paused' });

  const openPause = await ProjectPauseHistory.findOne({ projectId: project._id, status: 'open' }).sort({ createdAt: -1 });
  if (!openPause) return res.status(400).json({ success: false, message: 'No open pause record found for this project' });

  project.isPaused = false;
  await project.save();

  openPause.status           = 'resolved';
  openPause.resolvedBy       = req.user._id;
  openPause.resolvedSolution = resolvedSolution || openPause.resolvedSolution;
  openPause.resumedAt        = new Date();
  await openPause.save();

  await AuditLog.log({ actorId: req.user._id, action: 'resume_project', targetType: 'Project', targetId: project._id, detail: `Resumed project "${project.name}"` });
  return res.status(200).json({ success: true, message: 'Project resumed' });
});

// POST /api/group/:groupId/projects/:projectId/pause/:pauseId/comment — admin reviews, comments, suggests a solution
const addPauseComment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Only an admin can review a paused project' });

  const { comment, suggestedSolution } = req.body;
  if (!comment && !suggestedSolution)
    return res.status(400).json({ success: false, message: 'Provide a comment or a suggested solution' });

  const pauseRecord = await ProjectPauseHistory.findOne({ _id: req.params.pauseId, projectId: req.params.projectId });
  if (!pauseRecord) return res.status(404).json({ success: false, message: 'Pause record not found' });

  pauseRecord.comments.push({ authorId: req.user._id, comment, suggestedSolution });
  await pauseRecord.save();

  return res.status(200).json({ success: true, message: 'Comment added', pauseRecord });
});

// GET /api/group/:groupId/projects/:projectId/pause-history
const getPauseHistory = asyncHandler(async (req, res) => {
  const history = await ProjectPauseHistory.find({ projectId: req.params.projectId })
    .populate('pausedBy', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('comments.authorId', 'name email')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, history });
});

module.exports = { pauseProject, resumeProject, addPauseComment, getPauseHistory };