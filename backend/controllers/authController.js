const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const User     = require('../models/user.js');
const Employee = require('../models/Employee.js');
const TechnicalLog = require('../models/TechnicalLog.js');

const ACTIVE_USER = { archiveState: { $ne: 'trash' } };

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, ...ACTIVE_USER });
    if (!user) {
      TechnicalLog.log({
        level: 'warn', type: 'failed_login',
        endpoint: req.originalUrl, method: req.method, statusCode: 404,
        message: `Login attempt for unknown email "${email}"`, ip: req.ip,
      });
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      TechnicalLog.log({
        level: 'warn', type: 'failed_login', userId: user._id,
        endpoint: req.originalUrl, method: req.method, statusCode: 400,
        message: `Wrong password for "${email}"`, ip: req.ip,
      });
      return res.status(400).json({ message: 'Invalid credentials', success: false });
    }

    const employee = await Employee.findOne({ userId: user._id, archiveState: { $ne: 'trash' } });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '10d' }
    );

    TechnicalLog.log({
      level: 'info', type: 'login', userId: user._id,
      endpoint: req.originalUrl, method: req.method, statusCode: 200,
      message: `"${user.name}" logged in`, ip: req.ip,
    });

    return res.status(200).json({
      message: 'Login successful!',
      success: true,
      token,
      user: {
        id:                 user._id,
        name:               user.name,
        email:              user.email,
        role:               user.role,
        profileId:          employee ? employee._id : null,
        employeeId:         employee ? employee.employeeId : '',
        mustChangePassword: user.mustChangePassword ?? false,  // ← key flag
      },
    });
  } catch (err) {
    console.error(err);
    TechnicalLog.log({
      level: 'error', type: 'server_error',
      endpoint: req.originalUrl, method: req.method, statusCode: 500,
      message: err.message, stack: err.stack, ip: req.ip,
    });
    return res.status(500).json({ message: 'Server error', success: false });
  }
};

const logout = async (req, res) => {
  TechnicalLog.log({
    level: 'info', type: 'logout', userId: req.user?._id,
    endpoint: req.originalUrl, method: req.method, statusCode: 200,
    message: `"${req.user?.name}" logged out`, ip: req.ip,
  });
  return res.status(200).json({ success: true, message: 'Logged out' });
};

const verify = (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id:                 req.user._id,
      name:               req.user.name,
      email:              req.user.email,
      role:               req.user.role,
      profileId:          req.user.profileId,
      employeeId:         req.user.employeeId,
      mustChangePassword: req.user.mustChangePassword,
    },
  });
};

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, ...ACTIVE_USER });
    if (!user)
      return res.status(404).json({ success: false, message: 'Email not found in records' });
    return res.status(200).json({ success: true, message: 'Email verified' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const resetPasswordDirect = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, ...ACTIVE_USER });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    return res.status(200).json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Called when user logs in for first time with admin-set password
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ _id: req.user._id, ...ACTIVE_USER });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    user.password           = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;  // ← clears the flag; this is also the point
                                      //   at which the one-time admin credentials
                                      //   screen becomes permanently inaccessible —
                                      //   see Feature 1 notes in UserManagement.jsx
    user.firstLoginToken    = undefined; // ← erases the one-time access token too
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login, logout, verify, checkEmail, resetPasswordDirect, changePassword };