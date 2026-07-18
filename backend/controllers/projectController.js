const { createProject, listProjects, getProject, updateProject, deleteProject } = require('./project/projectCrud');
const { changeWorkflowStatus, getWorkflowHistory, lockDesignPhase } = require('./project/projectWorkflow');
const { pauseProject, resumeProject, addPauseComment, getPauseHistory } = require('./project/projectPause');

module.exports = {
  createProject, listProjects, getProject, updateProject, deleteProject,
  changeWorkflowStatus, getWorkflowHistory, lockDesignPhase,
  pauseProject, resumeProject, addPauseComment, getPauseHistory,
};