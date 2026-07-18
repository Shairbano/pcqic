const Task         = require('../../models/Task');
const asyncHandler = require('../../utils/asyncHandler');
const { ACTIVE_ARCHIVE } = require('./taskConstants');

// GET /api/my-tasks
const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({
    $or: [{ assignedTo: req.user._id }, { 'assignees.userId': req.user._id }],
    ...ACTIVE_ARCHIVE,
  })
    .select('title description projectId groupId createdBy assignedTo assignees status progress weightPercent deadline archiveState')
    .populate('projectId', 'name')
    .populate('groupId', 'name')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, tasks });
});

module.exports = { getMyTasks };