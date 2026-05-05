
import client from './client';

export const clubsApi = {
  getAll:     (params = '') => client(`/clubs${params}`),
  getOne:     (id)          => client(`/clubs/${id}`),
  create:     (data)        => client('/clubs', { body: data }),
  join:       (id)          => client(`/clubs/${id}/join`, { method: 'POST' }),
  leave:      (id)          => client(`/clubs/${id}/leave`, { method: 'DELETE' }),
  joinByCode: (code)        => client(`/join/${code}`, { method: 'POST' }),

  // Управління
  updateStatus:     (id, status) => client(`/clubs/${id}/status`, { method: 'PATCH', body: { status } }),
  setDiscussionDate:(id, date)   => client(`/clubs/${id}/discussion-date`, { method: 'POST', body: { date } }),
  closeRecruiting:  (id)         => client(`/clubs/${id}/close-recruiting`, { method: 'POST' }),

  // Учасники
  getMembers: (id)              => client(`/clubs/${id}/members`),
  kickMember: (clubId, userId)  => client(`/clubs/${clubId}/members/${userId}`, { method: 'DELETE' }),
  invite:     (clubId, userId)  => client(`/clubs/${clubId}/invite`, { body: { user_id: userId } }),

  // Milestones
  getMilestones: (id)   => client(`/clubs/${id}/milestones`),
  addMilestone:  (id, data) => client(`/clubs/${id}/milestones`, { body: data }),

  // Повідомлення (REST fallback)
  getMessages: (id, before = '') => client(`/clubs/${id}/messages${before ? '?before=' + before : ''}`),
  deleteMessage:(clubId, msgId)  => client(`/clubs/${clubId}/messages/${msgId}`, { method: 'DELETE' }),
};