const Group        = require('../../models/Group');
const Project      = require('../../models/Project');
const Task         = require('../../models/Task');
const User         = require('../../models/user');
const Employee     = require('../../models/Employee');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const asyncHandler  = require('../../utils/asyncHandler');

// GET /api/group/archived/items
const getArchivedItems = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isSystemAdmin = req.user.role === 'admin';

  const memberGroupFilter = {
    $or: [
      { createdBy: userId },
      { groupHead: userId },
    ],
  };

  const groupFilter = isSystemAdmin
    ? { archiveState: 'locked' }
    : { archiveState: 'locked', ...memberGroupFilter };

  const groups = await Group.find(groupFilter)
    .populate('createdBy', 'name email')
    .populate('groupHead', 'name email')
    .sort({ archivedAt: -1, updatedAt: -1 });

  const memberGroupIds = isSystemAdmin
    ? []
    : await Group.find(memberGroupFilter).distinct('_id');

  const projectFilter = isSystemAdmin
    ? { archiveState: 'locked' }
    : {
        archiveState: 'locked',
        $or: [
          { createdBy: userId },
          { groupId: { $in: memberGroupIds } },
        ],
      };

  const projects = await Project.find(projectFilter)
    .populate('createdBy', 'name email')
    .populate('groupId', 'name')
    .sort({ archivedAt: -1, updatedAt: -1 });

  const taskFilter = isSystemAdmin
    ? { archiveState: 'trash' }
    : {
        archiveState: 'trash',
        $or: [
          { createdBy: userId },
          { assignedTo: userId },
          { groupId: { $in: memberGroupIds } },
        ],
      };

  const tasks = await Task.find(taskFilter)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('projectId', 'name')
    .populate('groupId', 'name')
    .sort({ archivedAt: -1, updatedAt: -1 });

  let users = [];
  if (isSystemAdmin) {
    const trashedUsers = await User.find({ archiveState: 'trash' })
      .select('name email role archivedAt')
      .sort({ archivedAt: -1, updatedAt: -1 })
      .lean();
    const employeeProfiles = await Employee.find({
      userId: { $in: trashedUsers.map(user => user._id) },
    }).select('userId employeeId').lean();
    const employeeIdByUser = new Map(
      employeeProfiles.map(profile => [profile.userId.toString(), profile.employeeId])
    );
    users = trashedUsers.map(user => ({
      ...user,
      employeeId: employeeIdByUser.get(user._id.toString()) || '',
    }));
  }

  // Removed group members — kept as trash (status: 'removed') instead of
  // being deleted outright, so a group head/admin can see and restore them.
  const removedMembersGroupFilter = isSystemAdmin
    ? { 'members.status': 'removed' }
    : { ...memberGroupFilter, 'members.status': 'removed' };

  const groupsWithRemovedMembers = await Group.find(removedMembersGroupFilter)
    .select('name members')
    .populate('members.userId', 'name email')
    .populate('members.removedBy', 'name')
    .lean();

  const members = [];
  for (const g of groupsWithRemovedMembers) {
    for (const m of g.members || []) {
      if (m.status === 'removed') {
        members.push({
          _id:        String(m._id),
          groupId:    g._id,
          groupName:  g.name,
          userId:     m.userId,
          removedBy:  m.removedBy,
          removedAt:  m.removedAt,
        });
      }
    }
  }
  members.sort((a, b) => new Date(b.removedAt) - new Date(a.removedAt));

  return res.status(200).json({ success: true, groups, projects, tasks, users, members });
});

// PATCH /api/group/archived/:kind/:id/restore
const restoreArchivedItem = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can restore locked or trash items' });
  }

  const { kind, id } = req.params;
  const nowClear = { archiveState: 'active', archivedBy: undefined, archivedAt: undefined };

  if (kind === 'groups') {
    const group = await Group.findByIdAndUpdate(id, { $set: { archiveState: 'active' }, $unset: { archivedBy: 1, archivedAt: 1 } }, { new: true });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const recipients = new Set(
      (group.members || [])
        .filter(m => m.status === 'accepted')
        .map(m => (m.userId?._id ?? m.userId).toString())
    );
    if (group.groupHead) recipients.add(group.groupHead.toString());
    recipients.delete(req.user._id.toString());

    await Promise.all([...recipients].map(recipientId => Notification.create({
      recipientId,
      type:        'group_released',
      message:     `${req.user.name} released your group "${group.name}". It is active again.`,
      contextId:   group._id,
      contextType: 'Group',
    })));

    await AuditLog.log({ actorId: req.user._id, action: 'restore_group', targetType: 'Group', targetId: group._id, detail: `Restored group "${group.name}"` });
    return res.status(200).json({ success: true, message: 'Group restored' });
  }

  if (kind === 'projects') {
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const group = await Group.findOne({ _id: project.groupId, archiveState: { $ne: 'locked' } });
    if (!group) return res.status(400).json({ success: false, message: 'Restore the group before restoring this project' });
    Object.assign(project, nowClear);
    await project.save();
    await AuditLog.log({ actorId: req.user._id, action: 'restore_project', targetType: 'Project', targetId: project._id, detail: `Restored project "${project.name}"` });
    return res.status(200).json({ success: true, message: 'Project restored' });
  }

  if (kind === 'tasks') {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const group = await Group.findOne({ _id: task.groupId, archiveState: { $ne: 'locked' } });
    const project = await Project.findOne({ _id: task.projectId, archiveState: { $ne: 'locked' } });
    if (!group || !project) return res.status(400).json({ success: false, message: 'Restore the group and project before restoring this task' });
    Object.assign(task, nowClear);
    await task.save();
    await AuditLog.log({ actorId: req.user._id, action: 'restore_task', targetType: 'Task', targetId: task._id, detail: `Restored task "${task.title}"` });
    return res.status(200).json({ success: true, message: 'Task restored' });
  }

  if (kind === 'users') {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    Object.assign(user, nowClear);
    await user.save();
    await Employee.findOneAndUpdate(
      { userId: user._id },
      { $set: { archiveState: 'active' }, $unset: { archivedBy: 1, archivedAt: 1 } }
    );
    await AuditLog.log({ actorId: req.user._id, action: 'restore_user', targetType: 'User', targetId: user._id, detail: `Restored user "${user.name}"` });
    return res.status(200).json({ success: true, message: 'User restored' });
  }

  if (kind === 'members') {
    const group = await Group.findOne({ 'members._id': id });
    if (!group) return res.status(404).json({ success: false, message: 'Removed member record not found' });
    const member = group.members.id(id);
    if (!member || member.status !== 'removed')
      return res.status(400).json({ success: false, message: 'This member is not in the removed state' });

    member.status     = 'accepted';
    member.respondedAt = new Date();
    member.removedBy  = undefined;
    member.removedAt  = undefined;
    await group.save();

    await Notification.create({
      recipientId: member.userId,
      type:        'group_released',
      message:     `${req.user.name} restored your membership in "${group.name}".`,
      contextId:   group._id,
      contextType: 'Group',
    });

    await AuditLog.log({ actorId: req.user._id, action: 'restore_member', targetType: 'Group', targetId: group._id, detail: `Restored a removed member to group "${group.name}"` });
    return res.status(200).json({ success: true, message: 'Member restored' });
  }

  return res.status(400).json({ success: false, message: 'Invalid archive type' });
});

// DELETE /api/group/archived/:kind/:id — permanently remove a locked/trash record.
// Unlike restoreArchivedItem, this cannot be undone.
const permanentlyDeleteArchivedItem = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can permanently delete locked or trash items' });
  }

  const { kind, id } = req.params;

  if (kind === 'groups') {
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.archiveState !== 'locked')
      return res.status(400).json({ success: false, message: 'Only locked groups can be permanently deleted' });

    await Task.deleteMany({ groupId: group._id });
    await Project.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(group._id);

    await AuditLog.log({ actorId: req.user._id, action: 'permanent_delete_group', targetType: 'Group', targetId: group._id, detail: `Permanently deleted group "${group.name}" and its projects/tasks` });
    return res.status(200).json({ success: true, message: 'Group permanently deleted' });
  }

  if (kind === 'projects') {
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.archiveState !== 'locked')
      return res.status(400).json({ success: false, message: 'Only locked projects can be permanently deleted' });

    await Task.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);

    await AuditLog.log({ actorId: req.user._id, action: 'permanent_delete_project', targetType: 'Project', targetId: project._id, detail: `Permanently deleted project "${project.name}" and its tasks` });
    return res.status(200).json({ success: true, message: 'Project permanently deleted' });
  }

  if (kind === 'tasks') {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.archiveState !== 'trash')
      return res.status(400).json({ success: false, message: 'Only trashed tasks can be permanently deleted' });

    await Task.findByIdAndDelete(task._id);

    await AuditLog.log({ actorId: req.user._id, action: 'permanent_delete_task', targetType: 'Task', targetId: task._id, detail: `Permanently deleted task "${task.title}"` });
    return res.status(200).json({ success: true, message: 'Task permanently deleted' });
  }

  if (kind === 'users') {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.archiveState !== 'trash')
      return res.status(400).json({ success: false, message: 'Only trashed users can be permanently deleted' });

    await Employee.findOneAndDelete({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    await AuditLog.log({ actorId: req.user._id, action: 'permanent_delete_user', targetType: 'User', targetId: user._id, detail: `Permanently deleted user "${user.name}"` });
    return res.status(200).json({ success: true, message: 'User permanently deleted' });
  }

  if (kind === 'members') {
    const group = await Group.findOne({ 'members._id': id });
    if (!group) return res.status(404).json({ success: false, message: 'Removed member record not found' });
    const member = group.members.id(id);
    if (!member || member.status !== 'removed')
      return res.status(400).json({ success: false, message: 'This member is not in the removed state' });

    group.members.pull({ _id: id });
    await group.save();

    await AuditLog.log({ actorId: req.user._id, action: 'permanent_delete_member', targetType: 'Group', targetId: group._id, detail: `Permanently deleted a removed member's record from group "${group.name}"` });
    return res.status(200).json({ success: true, message: 'Removed member record permanently deleted' });
  }

  return res.status(400).json({ success: false, message: 'Invalid archive type' });
});

// POST /api/group/:id/request-unlock
// Lets the group head (or the group's creator) send a message to every
// system admin asking them to release a locked group back to active.
const requestUnlock = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (group.archiveState !== 'locked')
    return res.status(400).json({ success: false, message: 'This group is not locked' });

  const isGroupHead = group.isGroupHead(req.user._id);
  const isCreator   = group.createdBy?.toString() === req.user._id.toString();
  if (!isGroupHead && !isCreator && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only the group head can request an unlock' });
  }

  const { message } = req.body;

  const admins = await User.find({ role: 'admin', archiveState: { $ne: 'trash' } }).select('_id');
  if (!admins.length) {
    return res.status(400).json({ success: false, message: 'No admins found to notify' });
  }

  await Promise.all(admins.map(admin => Notification.create({
    recipientId: admin._id,
    type:        'unlock_request',
    message:     `${req.user.name} is requesting to unlock the group "${group.name}".`,
    subject:     `Unlock request: ${group.name}`,
    body:        message || '',
    senderName:  req.user.name,
    senderEmail: req.user.email,
    contextId:   group._id,
    contextType: 'Group',
  })));

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'request_unlock_group',
    targetType: 'Group',
    targetId:   group._id,
    detail:     `${req.user.name} requested an unlock for group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'Unlock request sent to admins' });
});

module.exports = { getArchivedItems, restoreArchivedItem, permanentlyDeleteArchivedItem, requestUnlock };