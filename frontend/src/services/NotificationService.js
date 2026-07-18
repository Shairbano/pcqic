import api from '../utils/api';

const notificationService = {
  getAll:            ()     => api.get('/notifications'),
  getTrashed:        ()     => api.get('/notifications/trash'),
  markRead:          (id)   => api.patch(`/notifications/${id}/read`),
  markAllRead:       (types) => api.patch('/notifications/read-all', types ? { types } : {}),
  // Soft-delete — moves message(s) to trash
  remove:            (id)   => api.delete(`/notifications/${id}`),
  removeAll:         (body) => api.delete('/notifications', { data: body }),
  // Trash management
  restore:           (id)   => api.patch(`/notifications/${id}/restore`),
  permanentlyDelete: (id)   => api.delete(`/notifications/${id}/permanent`),
};

export default notificationService;