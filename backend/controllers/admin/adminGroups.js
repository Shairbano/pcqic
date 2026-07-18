const Group        = require('../../models/Group');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const asyncHandler  = require('../../utils/asyncHandler');
const { ACTIVE_GROUP } = require('./adminConstants');

const getAllGroups = asyncHandler(async (req, res) => {
  const filter = req.query.archiveState ? {} : { ...ACTIVE_GROUP };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.archiveState) filter.archiveState = req.query.archiveState;
  const groups = await Group.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, groups });
});

const approveGroup = asyncHandler(async (req, res) => {
  const { action, adminNote } = req.body;
  if (!['approve', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
  if (group.status !== 'pending')
    return res.status(400).json({ success: false, message: 'Group is not in pending state' });

  group.status    = action === 'approve' ? 'active' : 'rejected';
  group.adminNote = adminNote || '';
  await group.save();

  await Notification.create({
    recipientId: group.createdBy,
    type:        action === 'approve' ? 'group_approved' : 'group_rejected',
    message:     action === 'approve'
      ? `Your group "${group.name}" has been approved!`
      : `Your group "${group.name}" was rejected. ${adminNote || ''}`,
    contextId:   group._id,
    contextType: 'Group',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     `admin_${action}_group`,
    targetType: 'Group',
    targetId:   group._id,
    detail:     `"${req.user.name}" ${action}d group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: `Group ${action}d`, group });
});

module.exports = { getAllGroups, approveGroup };