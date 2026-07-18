
const { requireAdmin } = require('./admin/adminMiddleware');
const {
  getAllUsers, createUser, updateUserRole, adminResetPassword, deleteUser, getUserCredentials,
} = require('./admin/adminUsers');
const { getAllGroups, approveGroup } = require('./admin/adminGroups');
const { getAllProjects, approveProject } = require('./admin/adminProjects');
const { getOverviewReport, getTaskReport } = require('./admin/adminReports');
const { getAuditLog, getTechnicalLog, clearAuditLog, clearTechnicalLog } = require('./admin/adminLogs');

module.exports = {
  requireAdmin,
  getAllUsers, createUser, updateUserRole, adminResetPassword, deleteUser,
  getUserCredentials,
  getAllGroups, approveGroup,
  getAllProjects, approveProject,
  getOverviewReport, getTaskReport,
  getAuditLog,
  getTechnicalLog,
  clearAuditLog,
  clearTechnicalLog,
};