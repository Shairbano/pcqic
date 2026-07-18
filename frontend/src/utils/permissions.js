export const ACCESS = { FULL: 1, GROUP_HEAD: 2, MEMBER: 3, READ: 0 };
export const getAccessLevel = (user) => {
  if (!user) return ACCESS.READ;
  if (user.role === 'admin') return ACCESS.FULL;
  return ACCESS.MEMBER;
};
// Backend returns:  1 = group head,  0 = accepted member,  -1 = no access
export const can = {
  // Any logged-in user can attempt to create a group
  createGroup:   () => true,
  // Only system admin can approve/reject groups in the admin panel
  approveGroup:  (level) => level === ACCESS.FULL,
  // Only group head (backend access_level === 1) can manage members
  manageMembers: (level) => level === 1,
  // Only group head (backend access_level === 1) can create projects
  createProject: (level) => level === 1,
  // Only group head (backend access_level === 1) can create/assign tasks
  assignTask:    (level) => level === 1,
  // Only system admin manages platform users
  manageUsers:   (level) => level === ACCESS.FULL,
  // Any accepted member or group head can update task progress
  updateProgress: (level) => level === 1 || level === 0,
};