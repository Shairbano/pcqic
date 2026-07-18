const Group         = require('../../models/Group');
const Project       = require('../../models/Project');
const Task          = require('../../models/Task');
const Notification  = require('../../models/Notification');
const AuditLog       = require('../../models/AuditLog');
const TechnicalLog   = require('../../models/TechnicalLog');
const asyncHandler   = require('../../utils/asyncHandler');
const { getGroupAccessLevel, getGroupData } = require('./groupAccess');

const ACTIVE_ARCHIVE = { archiveState: { $ne: 'locked' } };

const createGroup = asyncHandler(async (req, res) => {
  const { name, description, coverPhoto, coverPosition } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  const isAdmin     = req.user.role === 'admin';
  const groupStatus = isAdmin ? 'active' : 'pending';

  const group = await Group.create({
    name,
    description,
    coverPhoto:  coverPhoto || undefined,
    coverPosition: coverPosition || undefined,
    createdBy:   req.user._id,
    groupHead:   req.user._id,
    status:      groupStatus,
    members: [{
      userId:   req.user._id,
      role:     'head',
      status:   'accepted',
      joinedAt: new Date(),
    }],
  });
  await TechnicalLog.log({
    level:      'info',
    type:       'create_group',
    userId:     req.user._id,
    endpoint:   req.originalUrl,
    method:     req.method,
    statusCode: 201,
    message: isAdmin
      ? `Admin created group "${name}" — auto-approved`
      : `Employee created group "${name}" — awaiting approval`,
  });

  const message = isAdmin
    ? 'Group created successfully'
    : 'Group created and pending admin approval';

  return res.status(201).json({ success: true, message, group });
});

const getGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined' || id === 'null' || !/^[a-f\d]{24}$/i.test(id))
    return res.status(400).json({ success: false, message: 'Invalid group ID' });
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  // Prevent access to locked groups (except admins can still see locked groups)
  if (group.archiveState === 'locked' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'This group is locked and cannot be accessed' });
  }

  const userId       = req.user._id;
  const isSystemAdmin = req.user.role === 'admin';
  const isCreator    = group.createdBy.toString() === userId.toString();
  const access_level = getGroupAccessLevel(group, userId);

  if (isSystemAdmin) {
    const data = await getGroupData(group, access_level, true);
    return res.status(200).json({ success: true, group: data });
  }

  if (access_level === -1 && !isCreator) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (group.status !== 'active' && access_level === -1 && !isCreator) {
    return res.status(403).json({ success: false, message: 'Group is not active' });
  }

  const effectiveLevel = (access_level === -1 && isCreator) ? 1 : access_level;
  const data = await getGroupData(group, effectiveLevel, false);
  return res.status(200).json({ success: true, group: data });
});

const listGroups = asyncHandler(async (req, res) => {
  const { type = 'my_groups' } = req.query;
  const userId = req.user._id;
  let groups;

  if (type === 'my_groups') {
    groups = await Group.find({
      ...ACTIVE_ARCHIVE,
      status: 'active',
      $or: [
        { groupHead: userId },
        { members: { $elemMatch: { userId, status: 'accepted', role: { $in: ['head', 'admin'] } } } },
      ],
    })
      .select('name description coverPhoto coverPosition status createdBy groupHead members')
      .populate('createdBy', 'name email')
      .populate('members.userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, groups });
  }

  if (type === 'my_pending_groups') {
    groups = await Group.find({
      ...ACTIVE_ARCHIVE,
      groupHead: userId,
      status: { $in: ['pending', 'rejected'] },
    })
      .select('name description status createdBy groupHead adminNote')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, groups });
  }

  if (type === 'member_groups') {
    groups = await Group.find({
      ...ACTIVE_ARCHIVE,
      groupHead: { $ne: userId },
      members:   { $elemMatch: { userId, status: 'accepted', role: 'member' } },
      status:    'active',
    })
      .select('name description coverPhoto status createdBy members')
      .populate('createdBy', 'name email')
      .populate('members.userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, groups });
  }

  if (type === 'requests') {
    groups = await Group.find({
      ...ACTIVE_ARCHIVE,
      members: { $elemMatch: { userId, status: 'pending', source: 'invite' } },
      status:  'active',
    })
      .select('name description status createdBy members')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, groups });
  }

  if (type === 'join_requests') {
    groups = await Group.find({
      ...ACTIVE_ARCHIVE,
      status: 'active',
      members: {
        $elemMatch: {
          userId,
          status: 'accepted',
          role: { $in: ['head', 'admin'] },
        },
      },
    })
      .select('name description groupHead createdBy members')
      .populate('createdBy', 'name email')
      .populate('groupHead', 'name email')
      .populate('members.userId', 'name email role')
      .sort({ createdAt: -1 });

    const shaped = groups
      .map(group => ({
        _id: group._id,
        name: group.name,
        description: group.description,
        groupHead: group.groupHead,
        createdBy: group.createdBy,
        pendingMembers: (group.members || [])
          .filter(member => member.status === 'pending' && member.source === 'join_request')
          .map(member => ({
            _id: member._id,
            userId: member.userId,
            role: member.role,
            source: member.source,
            reason: member.reason,
          })),
      }))
      .filter(group => group.pendingMembers.length > 0);

    return res.status(200).json({ success: true, groups: shaped });
  }

  if (type === 'all_active') {
    groups = await Group.find({ ...ACTIVE_ARCHIVE, status: 'active' })
      .select('name description status createdBy groupHead members')
      .populate('createdBy', 'name email')
      .populate('groupHead', 'name email')
      .populate('members.userId', 'name email role')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, groups });
  }

  return res.status(400).json({ success: false, message: 'Invalid type' });
});

const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (!group.isGroupHead(req.user._id))
    return res.status(403).json({ success: false, message: 'Only the group head can update this group' });

  const { name, description, coverPhoto, coverPosition } = req.body;
  if (name)                    group.name        = name;
  if (description !== undefined) group.description = description;
  if (coverPhoto)              group.coverPhoto  = coverPhoto;
  if (coverPosition)           group.coverPosition = coverPosition;

  await group.save();
  return res.status(200).json({ success: true, message: 'Group updated', group });
});

const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isGroupHead   = group.isGroupHead(req.user._id);
  const isSystemAdmin = req.user.role === 'admin';

  if (!isGroupHead && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Only the group head or system admin can delete this group' });

  // Feature #2 — Group Deletion Protection: refuse if the group still has
  // active projects. Admin must move or delete/pause those projects first.
  const activeProjectCount = await Project.countDocuments({
    groupId: group._id,
    status: 'active',
    archiveState: { $ne: 'locked' },
  });
  if (activeProjectCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'This group cannot be deleted because it still contains active projects.',
      activeProjectCount,
    });
  }

  group.archiveState = 'locked';
  group.archivedBy = req.user._id;
  group.archivedAt = new Date();
  await group.save();

  await Project.updateMany(
    { groupId: group._id },
    { $set: { archiveState: 'locked', archivedBy: req.user._id, archivedAt: new Date() } }
  );

  await Task.updateMany(
    { groupId: group._id },
    { $set: { archiveState: 'locked', archivedBy: req.user._id, archivedAt: new Date() } }
  );

  // Notify everyone in the group (except whoever performed the lock) that it's now locked
  const recipients = new Set(
    (group.members || [])
      .filter(m => m.status === 'accepted')
      .map(m => (m.userId?._id ?? m.userId).toString())
  );
  if (group.groupHead) recipients.add(group.groupHead.toString());
  recipients.delete(req.user._id.toString());

  await Promise.all([...recipients].map(recipientId => Notification.create({
    recipientId,
    type:        'group_locked',
    message:     `${req.user.name} locked your group "${group.name}".`,
    contextId:   group._id,
    contextType: 'Group',
  })));

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'delete_group',
    targetType: 'Group',
    targetId:   group._id,
    detail:     `Moved group "${group.name}" to locked`,
  });

  return res.status(200).json({ success: true, message: 'Group moved to locked folder' });
});

module.exports = { createGroup, getGroup, listGroups, updateGroup, deleteGroup };