 

const express = require('express');
const router  = express.Router();
const { verifyUser } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/adminController');

// All admin routes: must be logged in AND be an admin
router.use(verifyUser, requireAdmin);

// Users
router.get('/users',                     getAllUsers);
router.post('/users',                    createUser);
router.get('/users/:id/credentials',     getUserCredentials);
router.patch('/users/:id/role',          updateUserRole);
router.patch('/users/:id/reset-password', adminResetPassword);
router.delete('/users/:id',              deleteUser);

// Groups
router.get('/groups',                    getAllGroups);     // ?status=pending
router.patch('/groups/:id/approve',      approveGroup);    // body: { action: 'approve'|'reject', adminNote }

// Projects
router.get('/projects',                  getAllProjects);
router.patch('/projects/:id/approve',    approveProject);

// Reports
router.get('/reports/overview',          getOverviewReport);
router.get('/reports/tasks',             getTaskReport);

// Audit Log
router.get('/audit-log',                 getAuditLog);
router.delete('/audit-log',              clearAuditLog);
router.get('/technical-log',             getTechnicalLog);
router.delete('/technical-log',          clearTechnicalLog);

module.exports = router;