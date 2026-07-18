import api from '../utils/api';

const groupService = {
  getAll:        (type = 'my_groups') => api.get(`/group?type=${type}`),
  getAllActive:   ()                   => api.get('/public/groups'),
  getArchived:    ()                   => api.get('/group/archived/items'),
  restoreArchived: (kind, id)          => api.patch(`/group/archived/${kind}/${id}/restore`),
  permanentlyDeleteArchived: (kind, id) => api.delete(`/group/archived/${kind}/${id}`),
  getById:       (id)                 => api.get(`/group/${id}`),
  create:        (data)               => api.post('/group', data),
  update:        (id, data)           => api.patch(`/group/${id}`, data),
  delete:        (id)                 => api.delete(`/group/${id}`),

  invite:               (id, userId)                  => api.post(`/group/${id}/invite`, { userId }),
  respond:              (id, action, reason)           => api.patch(`/group/${id}/respond`, { action, reason }),
  removeMember:         (id, userId)                  => api.delete(`/group/${id}/members/${userId}`),
  updateMemberRole:     (id, userId, role)            => api.patch(`/group/${id}/members/${userId}/role`, { role }),
  getMemberProfile:     (id, userId)                  => api.get(`/group/${id}/members/${userId}/profile`),
  searchUsers:          (q)                           => api.get(`/group/search-users?q=${encodeURIComponent(q)}`),
  joinRequest:          (id)                          => api.post(`/group/${id}/join-request`),
  respondToJoinRequest: (id, memberId, action, reason) =>
    api.patch(`/group/${id}/members/${memberId}/respond`, { action, reason }),
  requestUnlock:        (id, message)                 => api.post(`/group/${id}/request-unlock`, { message }),
};

export default groupService;