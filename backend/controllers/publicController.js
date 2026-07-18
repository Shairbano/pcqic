const User = require('../models/user');
const Group = require('../models/Group');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { sendContactAdminEmail } = require('../utils/emailService');

const ACTIVE_GROUP = { archiveState: { $ne: 'locked' } };
const ACTIVE_PROJECT = { archiveState: { $ne: 'locked' } };
const ACTIVE_USER = { archiveState: { $ne: 'trash' } };

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getPublicOverview = async (req, res) => {
  try {
    const [totalUsers, activeGroups, activeProjects, pendingGroups, adminUsers, groups] = await Promise.all([
      User.countDocuments(ACTIVE_USER),
      Group.countDocuments({ ...ACTIVE_GROUP, status: 'active' }),
      Project.countDocuments({ ...ACTIVE_PROJECT, status: 'active' }),
      Group.countDocuments({ ...ACTIVE_GROUP, status: 'pending' }),
      User.countDocuments({ ...ACTIVE_USER, role: 'admin' }),
      Group.find({ ...ACTIVE_GROUP, status: 'active' }).select('members').lean(),
    ]);

    const groupsWithMembers = groups.filter(group =>
      (group.members || []).some(member => member.status === 'accepted')
    ).length;

    return res.status(200).json({
      success: true,
      overview: {
        totalUsers,
        activeGroups,
        activeProjects,
        pendingGroups,
        adminUsers,
        groupsWithMembers,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPublicGroups = async (req, res) => {
  try {
    const groups = await Group.find({ ...ACTIVE_GROUP, status: 'active' })
      .populate('createdBy', 'name')
      .populate('groupHead', 'name')
      .populate('members.userId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, groups });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPublicAdmins = async (req, res) => {
  try {
    const admins = await User.find({ ...ACTIVE_USER, role: 'admin' })
      .select('name email')
      .sort({ name: 1 });

    return res.status(200).json({ success: true, admins });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const contactAdmin = async (req, res) => {
  try {
    const { adminId, senderName, senderEmail, subject, message } = req.body;

    if (!adminId || !senderEmail || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Admin, email, subject, and message are required',
      });
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail);
    if (!validEmail) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    const admin = await User.findOne({ _id: adminId, ...ACTIVE_USER, role: 'admin' }).select('name email');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    await Notification.create({
      recipientId: admin._id,
      type: 'admin_contact',
      message: `Contact request from ${senderName || senderEmail}: ${subject}`,
      senderName: escapeHtml(senderName || 'Guest'),
      senderEmail: escapeHtml(senderEmail),
      subject: escapeHtml(subject),
      body: escapeHtml(message),
      contextType: 'Contact',
    });
    sendContactAdminEmail({
      adminEmail: admin.email,
      adminName: escapeHtml(admin.name),
      senderName: escapeHtml(senderName || 'Website Visitor'),
      senderEmail: escapeHtml(senderEmail),
      subject: escapeHtml(subject),
      message: escapeHtml(message),
    }).catch(err => console.error('[contactAdmin] Email failed:', err.message));

    return res.status(200).json({ success: true, message: 'Message sent to admin' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getPublicOverview,
  getPublicGroups,
  getPublicAdmins,
  contactAdmin,
};