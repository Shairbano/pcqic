const Project      = require('../../models/Project');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const asyncHandler  = require('../../utils/asyncHandler');
const { ACTIVE_PROJECT } = require('./adminConstants');

const getAllProjects = asyncHandler(async (req, res) => {
  const filter = req.query.archiveState ? {} : { ...ACTIVE_PROJECT };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.archiveState) filter.archiveState = req.query.archiveState;
  const projects = await Project.find(filter)
    .populate('createdBy', 'name email')
    .populate('groupId', 'name')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, projects });
});

const approveProject = asyncHandler(async (req, res) => {
  const { action, adminNote } = req.body;
  if (!['approve', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });

  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  project.status    = action === 'approve' ? 'active' : 'rejected';
  project.adminNote = adminNote || '';
  await project.save();

  await Notification.create({
    recipientId: project.createdBy,
    type:        action === 'approve' ? 'project_approved' : 'project_rejected',
    message:     `Your project "${project.name}" was ${action}d. ${adminNote || ''}`,
    contextId:   project._id,
    contextType: 'Project',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     `admin_${action}_project`,
    targetType: 'Project',
    targetId:   project._id,
    detail:     `"${req.user.name}" ${action}d project "${project.name}"`,
  });

  return res.status(200).json({ success: true, message: `Project ${action}d` });
});

module.exports = { getAllProjects, approveProject };