const ACTIVE_ARCHIVE = { archiveState: { $ne: 'locked' } };
const WORKFLOW_STAGES = ['pending', 'initiated', 'in_design', 'design_progress_phase', 'progress', 'finalization', 'acceptance', 'completed'];
const PROJECT_SELECT = 'name description groupId status workflowStage isPaused designPhaseLocked accessibility deadline createdBy createdAt files adminNote';

module.exports = { ACTIVE_ARCHIVE, WORKFLOW_STAGES, PROJECT_SELECT };