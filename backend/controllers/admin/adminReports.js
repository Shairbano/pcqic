const User        = require('../../models/user');
const Group       = require('../../models/Group');
const Project     = require('../../models/Project');
const Task        = require('../../models/Task');
const asyncHandler = require('../../utils/asyncHandler');
const { ACTIVE_GROUP, ACTIVE_PROJECT, ACTIVE_TASK, ACTIVE_USER } = require('./adminConstants');

const getOverviewReport = asyncHandler(async (req, res) => {
  const [totalUsers, totalGroups, totalProjects, totalTasks,
         pendingGroups, pendingProjects, overdueTasks, completedTasks] = await Promise.all([
    User.countDocuments(ACTIVE_USER),
    Group.countDocuments({ ...ACTIVE_GROUP, status: 'active' }),
    Project.countDocuments({ ...ACTIVE_PROJECT, status: 'active' }),
    Task.countDocuments(ACTIVE_TASK),
    Group.countDocuments({ ...ACTIVE_GROUP, status: 'pending' }),
    Project.countDocuments({ ...ACTIVE_PROJECT, status: 'pending' }),
    Task.countDocuments({ ...ACTIVE_TASK, deadline: { $lt: new Date() }, status: { $nin: ['completed'] } }),
    Task.countDocuments({ ...ACTIVE_TASK, status: 'completed' }),
  ]);

  return res.status(200).json({
    success: true,
    report: {
      totalUsers, totalGroups, totalProjects, totalTasks,
      pendingGroups, pendingProjects, overdueTasks, completedTasks,
    },
  });
});

const getTaskReport = asyncHandler(async (req, res) => {
  const tasks = await Task.find(ACTIVE_TASK)
    .populate('assignedTo', 'name email')
    .populate('createdBy',  'name email')
    .populate('projectId',  'name')
    .populate('groupId',    'name')
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, tasks });
});

module.exports = { getOverviewReport, getTaskReport };