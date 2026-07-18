const express = require('express');
const router  = express.Router({ mergeParams: true }); // mergeParams = inherit groupId
const { verifyUser } = require('../middleware/authMiddleware');
const {
  createProject, listProjects, getProject, updateProject, deleteProject,
  changeWorkflowStatus, getWorkflowHistory, lockDesignPhase,
  pauseProject, resumeProject, addPauseComment, getPauseHistory,
} = require('../controllers/projectController');

router.use(verifyUser);

router.post('/',            createProject);   // POST  /api/group/:groupId/projects
router.get('/',             listProjects);    // GET   /api/group/:groupId/projects
router.get('/:projectId',   getProject);      // GET   /api/group/:groupId/projects/:projectId
router.patch('/:projectId', updateProject);   // PATCH /api/group/:groupId/projects/:projectId
router.delete('/:projectId', deleteProject);  // DELETE /api/group/:groupId/projects/:projectId

// Feature #13 — Project Workflow Status
router.patch('/:projectId/workflow-status',         changeWorkflowStatus);
router.get('/:projectId/workflow-status/history',   getWorkflowHistory);

// Feature #13b — admin/head declares no more tasks will be added
router.patch('/:projectId/design-phase-lock',       lockDesignPhase);

// Feature #14 — Project Pause Workflow
router.post('/:projectId/pause',                    pauseProject);
router.post('/:projectId/resume',                   resumeProject);
router.post('/:projectId/pause/:pauseId/comment',   addPauseComment);
router.get('/:projectId/pause-history',             getPauseHistory);

module.exports = router;