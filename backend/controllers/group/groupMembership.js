
const Group        = require('../../models/Group');
const User         = require('../../models/user');
const Employee     = require('../../models/Employee');
const Notification = require('../../models/Notification');
const AuditLog      = require('../../models/AuditLog');
const asyncHandler  = require('../../utils/asyncHandler');
const { getGroupAccessLevel } = require('./groupAccess');

const getMemberProfile = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const requesterLevel = getGroupAccessLevel(group, req.user._id);
  if (requesterLevel < 0 && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You are not a member of this group' });
  }

  const targetUser = await User.findOne({ _id: req.params.userId, archiveState: { $ne: 'trash' } })
    .select('name email role');
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  const employee = await Employee.findOne({ userId: targetUser._id, archiveState: { $ne: 'trash' } })
    .select('employeeId');

  const member = group.getMember(targetUser._id);
  const groupRole = group.isGroupHead(targetUser._id) ? 'head' : (member?.role ?? 'member');

  return res.status(200).json({
    success: true,
    profile: {
      _id:        targetUser._id,
      name:       targetUser.name,
      email:      targetUser.email,
      role:       targetUser.role,        // 'admin' | 'employee' (system-wide role)
      employeeId: employee?.employeeId ?? null,
      groupRole,                          // 'head' | 'admin' | 'member' (role within this group)
    },
  });
});

const inviteMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (!group.isGroupHead(req.user._id))
    return res.status(403).json({ success: false, message: 'Only the group head can invite members' });
  if (group.status !== 'active')
    return res.status(400).json({ success: false, message: 'Group must be active before adding members' });

  const targetUser = await User.findOne({ _id: userId, archiveState: { $ne: 'trash' } });
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  const alreadyMember = group.getMember(userId);
  if (alreadyMember) {
    if (alreadyMember.status === 'accepted')
      return res.status(400).json({ success: false, message: 'User is already a member' });
    if (alreadyMember.status === 'pending')
      return res.status(400).json({ success: false, message: 'Invite already sent and pending' });

    // Check 3-day cooldown for members who rejected an earlier invite
    if (alreadyMember.status === 'rejected' && alreadyMember.rejectedAt) {
      const rejectionTime = new Date(alreadyMember.rejectedAt);
      const cooldownExpiry = new Date(rejectionTime.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
      const now = new Date();
      if (now < cooldownExpiry) {
        const hoursLeft = Math.ceil((cooldownExpiry - now) / (1000 * 60 * 60));
        return res.status(400).json({
          success: false,
          message: `This user declined an invite recently. You can re-invite them in ${hoursLeft} hours. (3-day cooldown after rejection)`,
        });
      }
    }

    alreadyMember.status      = 'pending';
    alreadyMember.source      = 'invite';
    alreadyMember.respondedAt = undefined;
    alreadyMember.rejectedAt  = undefined;
    alreadyMember.reason      = undefined;
  } else {
    group.members.push({ userId, role: 'member', status: 'pending', source: 'invite' });
  }

  await group.save();

  await Notification.create({
    recipientId: userId,
    type:        'group_invite',
    message:     `You've been invited to join the group "${group.name}"`,
    contextId:   group._id,
    contextType: 'Group',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'invite_member',
    targetType: 'Group',
    targetId:   group._id,
    detail:     `Invited user ${userId} to group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'Invite sent' });
});

const respondToInvite = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: "Action must be 'accept' or 'reject'" });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const member = group.getMember(req.user._id);
  if (!member || member.status !== 'pending')
    return res.status(400).json({ success: false, message: 'No pending invite found for this user' });

  if (action === 'accept') {
    member.status      = 'accepted';
    member.respondedAt = new Date();
    member.joinedAt    = new Date();
    member.reason      = undefined;
  } else {
    // For rejection, track it with timestamp for 3-day cooldown
    member.status      = 'rejected';
    member.respondedAt = new Date();
    member.rejectedAt  = new Date();
    member.reason      = reason || '';
  }

  await group.save();

  await Notification.create({
    recipientId: group.groupHead,
    type:        'group_invite',
    message:     `${req.user.name} ${action}ed the invite to group "${group.name}"${action === 'reject' && reason ? `. Reason: ${reason}` : ''}`,
    contextId:   group._id,
    contextType: 'Group',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     `${action}_group_invite`,
    targetType: 'Group',
    targetId:   group._id,
    detail:     `User ${req.user._id} ${action}ed invite to group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: `Invite ${action}ed` });
});

const removeMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (!group.isGroupHead(req.user._id))
    return res.status(403).json({ success: false, message: 'Only the group head can remove members' });

  const { userId } = req.params;
  if (userId === req.user._id.toString())
    return res.status(400).json({ success: false, message: 'Cannot remove yourself as group head' });

  const targetMember = group.getMember(userId);
  if (!targetMember)
    return res.status(404).json({ success: false, message: 'Member not found in this group' });
  if (targetMember.locked) {
    return res.status(400).json({
      success: false,
      message: 'This member is locked and cannot be removed. Unlock them first.',
    });
  }

  const removedUser = await User.findById(userId).select('name');

  targetMember.status     = 'removed';
  targetMember.removedBy  = req.user._id;
  targetMember.removedAt  = new Date();
  await group.save();

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'remove_member',
    targetType: 'Group',
    targetId:   group._id,
    detail:     `Removed user "${removedUser?.name ?? userId}" from group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'Member removed' });
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role))
    return res.status(400).json({ success: false, message: "role must be 'admin' or 'member'" });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (!group.isGroupHead(req.user._id) && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Only the group head or a system admin can update member roles' });

  const member = group.getMember(req.params.userId);
  if (!member || member.status !== 'accepted')
    return res.status(404).json({ success: false, message: 'Accepted member not found' });

  if (member.role === 'head')
    return res.status(400).json({ success: false, message: 'Group head role cannot be changed' });

  if (member.locked)
    return res.status(400).json({ success: false, message: 'This member is locked and their role cannot be changed. Unlock them first.' });

  member.role = role;
  await group.save();

  await AuditLog.log({
    actorId: req.user._id,
    action: 'update_group_member_role',
    targetType: 'Group',
    targetId: group._id,
    detail: `Updated user ${req.params.userId} role to ${role} in group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'Member role updated', group });
});

// Feature #3 — Group Head Member Lock
// PATCH /api/group/:id/members/:userId/lock
const lockMember = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim())
    return res.status(400).json({ success: false, message: 'A lock reason is required' });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isGroupHead   = group.isGroupHead(req.user._id);
  const isSystemAdmin = req.user.role === 'admin';
  if (!isGroupHead && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Only the group head or admin can lock a member' });

  const member = group.getMember(req.params.userId);
  if (!member || member.status !== 'accepted')
    return res.status(404).json({ success: false, message: 'Accepted member not found' });
  if (member.role === 'head')
    return res.status(400).json({ success: false, message: 'The group head cannot be locked' });

  member.locked     = true;
  member.lockedBy   = req.user._id;
  member.lockedAt   = new Date();
  member.lockReason = reason.trim();
  await group.save();

  await AuditLog.log({
    actorId: req.user._id, action: 'lock_member', targetType: 'Group', targetId: group._id,
    detail: `Locked member ${req.params.userId} in group "${group.name}": ${reason.trim()}`,
    afterValue: { locked: true, reason: reason.trim() },
  });

  await Notification.create({
    recipientId: req.params.userId,
    type: 'member_locked',
    message: `${req.user.name} locked your membership in "${group.name}". Reason: ${reason.trim()}`,
    contextId: group._id,
    contextType: 'Group',
  });

  return res.status(200).json({ success: true, message: 'Member locked' });
});

// PATCH /api/group/:id/members/:userId/unlock
const unlockMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const isGroupHead   = group.isGroupHead(req.user._id);
  const isSystemAdmin = req.user.role === 'admin';
  if (!isGroupHead && !isSystemAdmin)
    return res.status(403).json({ success: false, message: 'Only the group head or admin can unlock a member' });

  const member = group.getMember(req.params.userId);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const previousReason = member.lockReason;
  member.locked     = false;
  member.lockedBy   = undefined;
  member.lockedAt   = undefined;
  member.lockReason = undefined;
  await group.save();

  await AuditLog.log({
    actorId: req.user._id, action: 'unlock_member', targetType: 'Group', targetId: group._id,
    detail: `Unlocked member ${req.params.userId} in group "${group.name}"`,
    beforeValue: { locked: true, reason: previousReason },
    afterValue: { locked: false },
  });

  await Notification.create({
    recipientId: req.params.userId,
    type: 'member_unlocked',
    message: `${req.user.name} unlocked your membership in "${group.name}".`,
    contextId: group._id,
    contextType: 'Group',
  });

  return res.status(200).json({ success: true, message: 'Member unlocked' });
});

// POST /api/group/:id/leave — self-service leave, blocked for locked members
const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (group.isGroupHead(req.user._id))
    return res.status(400).json({ success: false, message: 'The group head cannot leave their own group. Transfer headship or delete the group instead.' });

  const member = group.getMember(req.user._id);
  if (!member || member.status !== 'accepted')
    return res.status(404).json({ success: false, message: 'You are not a member of this group' });

  if (member.locked)
    return res.status(400).json({ success: false, message: `You are locked in this group and cannot leave. Reason: ${member.lockReason || 'no reason given'}. Ask the group head or an admin to unlock you.` });

  group.members = group.members.filter(m => m.userId.toString() !== req.user._id.toString());
  await group.save();

  await AuditLog.log({
    actorId: req.user._id, action: 'leave_group', targetType: 'Group', targetId: group._id,
    detail: `"${req.user.name}" left group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'You have left the group' });
});

const requestToJoin = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group || group.status !== 'active')
    return res.status(404).json({ success: false, message: 'Group not found' });

  if (group.isGroupHead(req.user._id))
    return res.status(400).json({ success: false, message: 'You are already the group head' });

  const alreadyMember = group.getMember(req.user._id);
  if (alreadyMember) {
    if (alreadyMember.status === 'accepted')
      return res.status(400).json({ success: false, message: 'Already a member' });
    if (alreadyMember.status === 'pending')
      return res.status(400).json({ success: false, message: 'Request already pending' });

    // Check 3-day cooldown for rejected users
    if (alreadyMember.status === 'rejected' && alreadyMember.rejectedAt) {
      const rejectionTime = new Date(alreadyMember.rejectedAt);
      const cooldownExpiry = new Date(rejectionTime.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
      const now = new Date();
      if (now < cooldownExpiry) {
        const hoursLeft = Math.ceil((cooldownExpiry - now) / (1000 * 60 * 60));
        return res.status(400).json({
          success: false,
          message: `You can request again in ${hoursLeft} hours. (3-day cooldown after rejection)`
        });
      }
    }

    alreadyMember.status      = 'pending';
    alreadyMember.respondedAt = undefined;
    alreadyMember.rejectedAt  = undefined;
    alreadyMember.reason      = undefined;
  } else {
    group.members.push({ userId: req.user._id, role: 'member', status: 'pending', source: 'join_request' });
  }
  await group.save();

  await Notification.create({
    recipientId: group.groupHead,
    type:        'group_invite',
    message:     `${req.user.name} has requested to join "${group.name}"`,
    contextId:   group._id,
    contextType: 'Group',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'request_join_group',
    targetType: 'Group',
    targetId:   group._id,
    detail:     `${req.user.name} requested to join group "${group.name}"`,
  });

  return res.status(200).json({ success: true, message: 'Join request sent to group head' });
});

const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: "Action must be 'accept' or 'reject'" });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  if (!group.isGroupHead(req.user._id))
    return res.status(403).json({ success: false, message: 'Only the group head can approve or reject join requests' });

  const member = group.members.id(req.params.memberId);
  if (!member || member.status !== 'pending')
    return res.status(400).json({ success: false, message: 'No pending request found' });

  if (action === 'accept') {
    member.status      = 'accepted';
    member.respondedAt = new Date();
    member.joinedAt    = new Date();
    member.reason      = undefined;
  } else {
    // For rejection, track it with timestamp for 3-day cooldown
    member.status      = 'rejected';
    member.respondedAt = new Date();
    member.rejectedAt  = new Date();
    member.reason      = reason || '';
  }

  await group.save();

  await Notification.create({
    recipientId: member.userId,
    type:        'group_invite',
    message:     action === 'accept'
      ? `Your request to join "${group.name}" was approved!`
      : `Your request to join "${group.name}" was declined. ${reason || ''} You can request again after 3 days.`,
    contextId:   group._id,
    contextType: 'Group',
  });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     `${action}_join_request`,
    targetType: 'Group',
    targetId:   group._id,
    detail:     `Group head ${action}ed join request from user ${member.userId}`,
  });

  return res.status(200).json({ success: true, message: `Request ${action}ed` });
});

module.exports = {
  getMemberProfile, inviteMember, respondToInvite, removeMember, updateMemberRole,
  lockMember, unlockMember, leaveGroup, requestToJoin, respondToJoinRequest,
};