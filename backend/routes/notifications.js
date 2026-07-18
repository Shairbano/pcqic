const express = require('express');
const router  = express.Router();
const { verifyUser } = require('../middleware/authMiddleware');
const {
  getNotifications, getTrashedNotifications, markRead, markAllRead,
  deleteNotification, deleteAllNotifications, restoreNotification, permanentlyDeleteNotification,
} = require('../controllers/notificationController');

router.use(verifyUser);

router.get('/',                 getNotifications);
router.get('/trash',            getTrashedNotifications);
router.patch('/read-all',       markAllRead);
router.patch('/:id/read',       markRead);
router.patch('/:id/restore',    restoreNotification);
router.delete('/',              deleteAllNotifications);       // soft-delete (bulk) -> trash
router.delete('/:id/permanent', permanentlyDeleteNotification); // hard delete, must already be trashed
router.delete('/:id',           deleteNotification);            // soft-delete (single) -> trash

module.exports = router;