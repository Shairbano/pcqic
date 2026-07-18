const Project              = require('../../models/Project');
const Group                = require('../../models/Group');
const Task                 = require('../../models/Task');
const AuditLog              = require('../../models/AuditLog');
const TechnicalLog          = require('../../models/TechnicalLog');
const ProjectStatusHistory = require('../../models/ProjectStatusHistory');
const crypto                = require('crypto');
const asyncHandler          = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE, PROJECT_SELECT } = require('./projectConstants');
const { validateTodayOrFuture, getProjectAccessLevel, getProjectData } = require('./projectHelpers');

// POST /api/group/:groupId/projects
const createProject = asyncHandler(async (req, res) => {
  const { name, description, deadline, files, accessibility } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE });
  if (!group || group.status !== 'active')
    return res.status(404).json({ success: false, message: 'Active group not found' });

  const deadlineError = validateTodayOrFuture(deadline);
  if (deadlineError) return res.status(400).json({ success: false, message: deadlineError });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the group head can create projects' });

  if (accessibility && !['private', 'group', 'public'].includes(accessibility))
    return res.status(400).json({ success: false, message: 'Invalid accessibility value' });

  const attachments = [];
  if (Array.isArray(files)) {
    for (const f of files) {
      if (!f.name || !f.data || !f.mimeType)
        return res.status(400).json({ success: false, message: 'Each file needs name, data, and mimeType' });
      attachments.push({
        name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
        uploadedBy: req.user._id, uploadedAt: new Date(),
        fileGroupId: crypto.randomUUID(), version: 1, // Feature #6
        accessibility: f.accessibility || 'private',              // Feature #7
      });
    }
  }

  const project = await Project.create({
    name, description,
    groupId:   group._id,
    createdBy: req.user._id,
    status:    'active',
    workflowStage: 'pending', // Feature #13 — every project starts at the top of the workflow
    accessibility: accessibility || 'private', // Feature #7
    deadline:  deadline || undefined,
    files:     attachments,
  });

  await ProjectStatusHistory.create({
    projectId: project._id, previousStatus: null, newStatus: 'pending',
    changedBy: req.user._id, remarks: 'Project created',
  });

  // Creations go to the Technical Log, not the Management Log — see
  // models/TechnicalLog.js for the reasoning.
  await TechnicalLog.log({
    level: 'info', type: 'create_project', userId: req.user._id,
    endpoint: req.originalUrl, method: req.method, statusCode: 201,
    message: `Created project "${name}" in group "${group.name}"`,
  });
  return res.status(201).json({ success: true, message: 'Project created', project });
});

// GET /api/group/:groupId/projects
const listProjects = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const access_level  = getProjectAccessLevel(group, req.user._id);
  const isSystemAdmin = req.user.role === 'admin';

  // System admin who is NOT a member gets read-only (0), not group-head (1)
  if (access_level === -1 && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Access denied' });

  // Explicitly cap system admin non-member at 0 — never elevate to 1
  const effectiveLevel = (access_level === -1 && isSystemAdmin) ? 0 : access_level;

  const projects = await Project.find({ groupId: group._id, ...ACTIVE_ARCHIVE })
    .select(PROJECT_SELECT)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  const shaped = await Promise.all(projects.map(p => getProjectData(p, effectiveLevel)));
  return res.status(200).json({ success: true, projects: shaped, access_level: effectiveLevel });
});

// GET /api/group/:groupId/projects/:projectId
const getProject = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE })
    .select(PROJECT_SELECT);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level  = getProjectAccessLevel(group, req.user._id);
  const isSystemAdmin = req.user.role === 'admin';

  if (access_level === -1 && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Access denied' });

  // System admin non-member is capped at 0 — they cannot create tasks/projects
  // even if they hold the admin role. Only the actual group head gets 1.
  const effectiveLevel = (access_level === -1 && isSystemAdmin) ? 0 : access_level;

  const data = await getProjectData(project, effectiveLevel);
  return res.status(200).json({ success: true, project: data });
});

// PATCH /api/group/:groupId/projects/:projectId
const updateProject = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE }).select(PROJECT_SELECT);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the group head can update projects' });

  const { name, description, deadline, status, files, accessibility } = req.body;
  const deadlineError = validateTodayOrFuture(deadline);
  if (deadlineError) return res.status(400).json({ success: false, message: deadlineError });

  if (name)        project.name        = name;
  if (description) project.description = description;
  if (deadline)    project.deadline    = deadline;
  if (status)      project.status      = status;

  // Feature #7 — Project Head can change project accessibility
  if (accessibility) {
    if (!['private', 'group', 'public'].includes(accessibility))
      return res.status(400).json({ success: false, message: 'Invalid accessibility value' });
    project.accessibility = accessibility;
  }

  if (Array.isArray(files) && files.length > 0) {
    for (const f of files) {
      if (f.name && f.data && f.mimeType) {
        if (f.fileGroupId) {
          // Feature #6 — new version of an existing document, never overwrite
          const existingVersions = project.files.filter(pf => pf.fileGroupId === f.fileGroupId);
          const maxVersion = existingVersions.reduce((m, pf) => Math.max(m, pf.version || 1), 0);
          const original = existingVersions.find(pf => pf.version === 1);
          const isOriginalUploader = original?.uploadedBy?.toString() === req.user._id.toString();
          if (!isOriginalUploader && access_level !== 1) {
            return res.status(403).json({ success: false, message: 'Only the original uploader or project head can upload a new version' });
          }
          project.files.push({
            name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
            uploadedBy: req.user._id, fileGroupId: f.fileGroupId, version: maxVersion + 1,
            changeNotes: f.changeNotes || '', accessibility: f.accessibility || original?.accessibility || 'private',
          });
        } else {
          project.files.push({
            name: f.name, data: f.data, mimeType: f.mimeType, size: f.size || 0,
            uploadedBy: req.user._id, fileGroupId: crypto.randomUUID(), version: 1,
            accessibility: f.accessibility || 'private',
          });
        }
      }
    }
  }

  await project.save();
  await AuditLog.log({ actorId: req.user._id, action: 'update_project', targetType: 'Project', targetId: project._id, detail: `Updated project "${project.name}"` });
  return res.status(200).json({ success: true, message: 'Project updated', project });
});

// DELETE /api/group/:groupId/projects/:projectId
const deleteProject = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, ...ACTIVE_ARCHIVE }).select('_id name members groupHead createdBy');
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const project = await Project.findOne({ _id: req.params.projectId, groupId: group._id, ...ACTIVE_ARCHIVE }).select('_id groupId archiveState archivedBy archivedAt');
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const access_level = getProjectAccessLevel(group, req.user._id);
  if (access_level !== 1)
    return res.status(403).json({ success: false, message: 'Only the group head can delete projects' });

  project.archiveState = 'locked';
  project.archivedBy = req.user._id;
  project.archivedAt = new Date();
  await project.save();

  await Task.updateMany(
    { projectId: project._id },
    { $set: { archiveState: 'locked', archivedBy: req.user._id, archivedAt: new Date() } }
  );

  await AuditLog.log({ actorId: req.user._id, action: 'delete_project', targetType: 'Project', targetId: project._id, detail: `Moved project "${project.name}" to locked` });
  return res.status(200).json({ success: true, message: 'Project moved to locked folder' });
});

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };