const Group                = require('../../models/Group');
const Project              = require('../../models/Project');
const AuditLog              = require('../../models/AuditLog');
const ProjectStatusHistory = require('../../models/ProjectStatusHistory');
const asyncHandler          = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE, WORKFLOW_STAGES } = require('./projectConstants');
const { getProjectAccessLevel } = require('./projectHelpers');

// PATCH /api/group/:groupId/projects/:projectId/workflow-status
const changeWorkflowStatus = asyncHandler(async (req, res) => {
  const { newStatus, remarks } = req.body;
  if (!WORKFLOW_STAGES.includes(newStatus))
    return res.status(400).json({ success: false, message: `newStatus must be one of: ${WORKFLOW_STAGES.join(', ')}` });

  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE });
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1 && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Only the project/group head or an admin can change the workflow status' });

  const previousStatus = project.workflowStage;
  project.workflowStage = newStatus;
  await project.save();

  // Never overwritten — every change is its own row, oldest to newest.
  await ProjectStatusHistory.create({
    projectId: project._id, previousStatus, newStatus, changedBy: req.user._id, remarks,
  });

  await AuditLog.log({
    actorId: req.user._id, action: 'change_project_workflow_status', targetType: 'Project', targetId: project._id,
    detail: `Changed workflow status of "${project.name}" from "${previousStatus}" to "${newStatus}"`,
    beforeValue: previousStatus, afterValue: newStatus,
  });

  return res.status(200).json({ success: true, message: 'Workflow status updated', workflowStage: newStatus });
});

// GET /api/group/:groupId/projects/:projectId/workflow-status/history
const getWorkflowHistory = asyncHandler(async (req, res) => {
  const history = await ProjectStatusHistory.find({ projectId: req.params.projectId })
    .populate('changedBy', 'name email')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, history });
});

// PATCH /api/group/:groupId/projects/:projectId/design-phase-lock
// Feature #13b — admin (or the group/project head) declares that no more
// tasks will be added to this project, i.e. the design phase is complete.
// This blocks further task creation (see taskCrud.js) and freezes the
// weight-band auto-advancement in taskHelpers.js so the stage stays put.
const lockDesignPhase = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE });
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1 && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Only the project/group head or an admin can close the design phase' });

  if (project.designPhaseLocked)
    return res.status(400).json({ success: false, message: 'The design phase is already closed for this project' });

  project.designPhaseLocked = true;

  const previousStatus = project.workflowStage;
  // If the project hasn't reached design_progress_phase yet on its own,
  // closing the design phase moves it there now; never move it backward.
  const currentIndex = WORKFLOW_STAGES.indexOf(project.workflowStage);
  const designDoneIndex = WORKFLOW_STAGES.indexOf('design_progress_phase');
  if (currentIndex < designDoneIndex) {
    project.workflowStage = 'design_progress_phase';
  }
  await project.save();

  if (project.workflowStage !== previousStatus) {
    await ProjectStatusHistory.create({
      projectId: project._id, previousStatus, newStatus: project.workflowStage, changedBy: req.user._id,
      remarks: remarks || 'Design phase closed by admin — no more tasks will be added',
    });
  }

  await AuditLog.log({
    actorId: req.user._id, action: 'lock_project_design_phase', targetType: 'Project', targetId: project._id,
    detail: `Closed the design phase for "${project.name}" — no further tasks can be added`,
  });

  return res.status(200).json({ success: true, message: 'Design phase closed. No more tasks can be added to this project.', workflowStage: project.workflowStage, designPhaseLocked: true });
});

module.exports = { changeWorkflowStatus, getWorkflowHistory, lockDesignPhase };