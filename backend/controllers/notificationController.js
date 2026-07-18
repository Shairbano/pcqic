// controllers/notificationController.js
// Place in: backend/controllers/notificationController.js

const Notification = require('../models/Notification');

// GET /api/notifications
// Get all ACTIVE (non-trashed) notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user._id,
      archiveState: { $ne: 'trash' },
    })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      archiveState: { $ne: 'trash' },
      read: false,
    });
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/notifications/trash
// Get trashed (soft-deleted) notifications for the logged-in user
const getTrashedNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user._id,
      archiveState: 'trash',
    }).sort({ archivedAt: -1, updatedAt: -1 });
    return res.status(200).json({ success: true, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { read: true }
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/notifications/read-all
// Body can optionally narrow the scope with { types: [...] }; if omitted,
// ALL of the user's unread notifications are marked read (unchanged from before).
const markAllRead = async (req, res) => {
  try {
    const { types } = req.body || {};
    const filter = { recipientId: req.user._id, read: false, archiveState: { $ne: 'trash' } };
    if (Array.isArray(types) && types.length) filter.type = { $in: types };

    await Notification.updateMany(filter, { read: true });
    return res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/notifications/:id
// Soft-delete: moves the message to trash instead of removing it outright.
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { $set: { archiveState: 'trash', archivedBy: req.user._id, archivedAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Message not found' });
    return res.status(200).json({ success: true, message: 'Message moved to trash' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/notifications
// Bulk soft-delete notifications belonging to the logged-in user.
// Body can narrow the scope with { ids: [...] } or { types: [...] };
// if neither is given, ALL of the user's (non-trashed) notifications are trashed.
const deleteAllNotifications = async (req, res) => {
  try {
    const { ids, types } = req.body || {};
    const filter = { recipientId: req.user._id, archiveState: { $ne: 'trash' } };

    if (Array.isArray(ids) && ids.length) {
      filter._id = { $in: ids };
    } else if (Array.isArray(types) && types.length) {
      filter.type = { $in: types };
    }

    const result = await Notification.updateMany(filter, {
      $set: { archiveState: 'trash', archivedBy: req.user._id, archivedAt: new Date() },
    });
    return res.status(200).json({
      success: true,
      message: 'Messages moved to trash',
      trashedCount: result.modifiedCount ?? result.nModified,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/notifications/:id/restore
const restoreNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, archiveState: 'trash' },
      { $set: { archiveState: 'active' }, $unset: { archivedBy: 1, archivedAt: 1 } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Trashed message not found' });
    return res.status(200).json({ success: true, message: 'Message restored' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/notifications/:id/permanent
// Permanently removes a message — only allowed once it's already in trash.
const permanentlyDeleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipientId: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Message not found' });
    if (notification.archiveState !== 'trash') {
      return res.status(400).json({ success: false, message: 'Only trashed messages can be permanently deleted' });
    }
    await Notification.findByIdAndDelete(notification._id);
    return res.status(200).json({ success: true, message: 'Message permanently deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getTrashedNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
  restoreNotification,
  permanentlyDeleteNotification,
};