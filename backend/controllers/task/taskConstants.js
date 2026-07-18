const ACTIVE_ARCHIVE = { archiveState: { $nin: ['trash', 'locked'] } };
module.exports = { ACTIVE_ARCHIVE };