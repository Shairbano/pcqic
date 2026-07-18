function getGroupAccessLevel(group, userId) {
  if (group.isGroupHead(userId)) return 1;
  const member = group.getMember(userId);
  if (member && member.status === 'accepted') return 0;
  return -1;
}

async function getGroupData(group, access_level, isSystemAdmin = false) {
  await group.populate([
    { path: 'createdBy', select: 'name email role' },
    { path: 'groupHead',  select: 'name email role' },
    { path: 'members.userId', select: 'name email role' },
  ]);

  const base = {
    _id:         group._id,
    name:        group.name,
    description: group.description,
    coverPhoto:  group.coverPhoto,
    coverPosition: group.coverPosition || { x: 50, y: 50 },
    status:      group.status,
    createdBy:   group.createdBy,
    groupHead:   group.groupHead,
    createdAt:   group.createdAt,
  };

  if (access_level === 1) {
    return {
      ...base,
      access_level,
      members: group.members.map(m => ({
        _id:         m._id,
        userId:      m.userId,
        role:        m.role,
        status:      m.status,
        source:      m.source,
        joinedAt:    m.joinedAt,
        respondedAt: m.respondedAt,
        reason:      m.reason,
      })),
      adminNote: group.adminNote,
    };
  }

  if (isSystemAdmin && access_level === -1) {
    return {
      ...base,
      access_level: -1,
      members: group.members.map(m => ({
        _id:    m._id,
        userId: m.userId,
        role:   m.role,
        status: m.status,
        source: m.source,
      })),
      adminNote: group.adminNote,
    };
  }

  return {
    ...base,
    access_level,
    members: group.members
      .filter(m => m.status === 'accepted')
      .map(m => ({ _id: m._id, userId: m.userId, role: m.role, status: m.status, joinedAt: m.joinedAt })),
  };
}

module.exports = { getGroupAccessLevel, getGroupData };