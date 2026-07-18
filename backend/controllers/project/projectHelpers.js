const Task = require('../../models/Task');

function validateTodayOrFuture(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Enter a valid deadline';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date);
  selected.setHours(0, 0, 0, 0);
  return selected < today ? 'Deadline cannot be before today' : null;
}

function getProjectAccessLevel(group, userId) {
  if (!userId) return -1;
  // Only the actual group head gets full control — system admin does NOT auto-get this
  if (group.isGroupHead(userId)) return 1;
  const member = group.getMember(userId);
  if (member && member.status === 'accepted') return 0;
  return -1;
}

async function computeProjectProgress(projectId) {
  const tasks = await Task.find({ projectId, archiveState: { $nin: ['trash', 'locked'] } })
    .select('weightPercent progress status');

  const totalWeightAssigned = tasks.reduce((sum, t) => sum + (t.weightPercent || 0), 0);

  let completedPercent;
  if (totalWeightAssigned > 0) {
    // Weighted: each task counts for exactly the share of the project its
    // creator assigned it (Feature #12).
    completedPercent = Math.round(tasks.reduce((sum, t) => sum + (t.weightPercent || 0) * ((t.progress || 0) / 100), 0));
  } else if (tasks.length > 0) {
    // Weight is an optional field at task creation, and is very often left
    // blank — without this fallback, a project with real, completed tasks
    // would show a flat 0% forever just because nobody assigned weights,
    // which reads as "progress isn't updating" even though it plainly is.
    // Fall back to a simple, unweighted average of every active task's own
    // progress until at least one task actually has a weight assigned.
    completedPercent = Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length);
  } else {
    completedPercent = 0;
  }

  const remainingPercent = Math.max(0, 100 - completedPercent);

  return {
    overallProgress: completedPercent, // same number — "how much of the whole project is done"
    completedPercent,
    remainingPercent,
    totalWeightAssigned,               // how much of the 100% has been distributed across tasks so far
    unassignedWeight: Math.max(0, 100 - totalWeightAssigned),
  };
}

async function getProjectData(project, access_level) {
  await project.populate('createdBy', 'name email');
  const progress = await computeProjectProgress(project._id);
  const base = {
    _id:           project._id,
    name:          project.name,
    description:   project.description,
    groupId:       project.groupId,
    status:        project.status,
    workflowStage: project.workflowStage,   // Feature #13
    designPhaseLocked: project.designPhaseLocked ?? false, // Feature #13b
    isPaused:      project.isPaused,        // Feature #14
    accessibility: project.accessibility,   // Feature #7
    progress,                               // Feature #12
    deadline:      project.deadline,
    createdBy:     project.createdBy,
    createdAt:     project.createdAt,
    files:         project.files ?? [],
    access_level, // always included so frontend never falls back to role-based level
  };
  if (access_level === 1) {
    return { ...base, adminNote: project.adminNote };
  }
  return base;
}

module.exports = {
  validateTodayOrFuture, getProjectAccessLevel, computeProjectProgress, getProjectData,
};