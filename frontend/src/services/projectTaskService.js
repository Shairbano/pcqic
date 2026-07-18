import api from '../utils/api';

export const projectService = {
  getByGroup: (groupId)                      => api.get(`/group/${groupId}/projects`),
  getById:    (groupId, projectId)           => api.get(`/group/${groupId}/projects/${projectId}`),
  create:     (groupId, data)               => api.post(`/group/${groupId}/projects`, data),
  update:     (groupId, projectId, data)    => api.patch(`/group/${groupId}/projects/${projectId}`, data),
  delete:     (groupId, projectId)          => api.delete(`/group/${groupId}/projects/${projectId}`),

  // Feature #13 — Workflow Status (was missing; "Change stage" button had
  // nothing to call, which is why it appeared to do nothing).
  changeWorkflowStatus: (groupId, projectId, newStatus, remarks) =>
    api.patch(`/group/${groupId}/projects/${projectId}/workflow-status`, { newStatus, remarks }),
  getWorkflowHistory:   (groupId, projectId) =>
    api.get(`/group/${groupId}/projects/${projectId}/workflow-status/history`),

  // Feature #13b — admin/head declares no more tasks will be added, so the
  // project's design phase is considered complete.
  lockDesignPhase: (groupId, projectId, remarks) =>
    api.patch(`/group/${groupId}/projects/${projectId}/design-phase-lock`, { remarks }),

  pause:  (groupId, projectId, pauseReason, description, expectedResolutionDate) =>
    api.post(`/group/${groupId}/projects/${projectId}/pause`, { pauseReason, description, expectedResolutionDate }),
  resume: (groupId, projectId, resolvedSolution) =>
    api.post(`/group/${groupId}/projects/${projectId}/resume`, { resolvedSolution }),
};

export const taskService = {
  getByProject: (groupId, projectId)               => api.get(`/group/${groupId}/projects/${projectId}/tasks`),
  getById:      (groupId, projectId, taskId)       => api.get(`/group/${groupId}/projects/${projectId}/tasks/${taskId}`),
  create:       (groupId, projectId, data)         => api.post(`/group/${groupId}/projects/${projectId}/tasks`, data),
  delete:       (groupId, projectId, taskId)       => api.delete(`/group/${groupId}/projects/${projectId}/tasks/${taskId}`),
  action:       (groupId, projectId, taskId, data) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, data),

  accept:  (groupId, projectId, taskId) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, { action: 'accept' }),
  reject:  (groupId, projectId, taskId, note) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, { action: 'reject', note }),
  forward: (groupId, projectId, taskId, forwardedTo, note) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, { action: 'forward', forwardedTo, note }),
  update:  (groupId, projectId, taskId, progress, note, files) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, {
      action: 'update', progress, note, files,
    }),
  leave:   (groupId, projectId, taskId, leaveReason) =>
    api.patch(`/group/${groupId}/projects/${projectId}/tasks/${taskId}/action`, { action: 'leave', leaveReason }),

  getMyTasks: () => api.get('/my-tasks'),
};