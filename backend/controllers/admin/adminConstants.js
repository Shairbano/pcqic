const ACTIVE_GROUP   = { archiveState: { $ne: 'locked' } };
const ACTIVE_PROJECT = { archiveState: { $ne: 'locked' } };
const ACTIVE_TASK    = { archiveState: { $nin: ['trash', 'locked'] } };
const ACTIVE_USER    = { archiveState: { $ne: 'trash' } };

module.exports = { ACTIVE_GROUP, ACTIVE_PROJECT, ACTIVE_TASK, ACTIVE_USER };