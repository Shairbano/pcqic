const User         = require('../../models/user');
const Employee     = require('../../models/Employee');
const AuditLog      = require('../../models/AuditLog');
const TechnicalLog  = require('../../models/TechnicalLog');
const bcrypt        = require('bcrypt');
const crypto        = require('crypto');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../../utils/emailService');
const asyncHandler  = require('../../utils/asyncHandler');
const { ACTIVE_USER } = require('./adminConstants');
const { generateUniqueEmployeeId, verifyEmailDomain } = require('./adminHelpers');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ ...ACTIVE_USER, isPrimaryAdmin: { $ne: true } })
    .select('-password -firstLoginToken').sort({ createdAt: -1 }).lean();
  let employeeProfiles = await Employee.find({
    userId: { $in: users.map(user => user._id) },
  }).select('userId employeeId').lean();

  const existingProfileIds = new Set(employeeProfiles.map(profile => profile.userId.toString()));
  const missingProfiles = users.filter(user => !existingProfileIds.has(user._id.toString()));
  for (const user of missingProfiles) {
    const employeeId = await generateUniqueEmployeeId();
    const profile = await Employee.create({ userId: user._id, employeeId });
    employeeProfiles.push({ userId: profile.userId, employeeId: profile.employeeId });
  }

  const employeeIdByUser = new Map(
    employeeProfiles.map(profile => [profile.userId.toString(), profile.employeeId])
  );

  const shapedUsers = users
    .map(user => ({
      ...user,
      employeeId: employeeIdByUser.get(user._id.toString()) || '',
    }))
    .sort((a, b) => (a.employeeId || '').localeCompare(b.employeeId || '', undefined, { numeric: true }));

  return res.status(200).json({
    success: true,
    users: shapedUsers,
  });
});

// POST /api/admin/users
const createUser = asyncHandler(async (req, res) => {
  const {
    name, email, password, role,
    department, designation, section, salary,
    dob, gender, maritalStatus,
  } = req.body;

  if (!name || !email || !password || !role)
    return res.status(400).json({ success: false, message: 'name, email, password, role are required' });
  if (!['admin', 'employee'].includes(role))
    return res.status(400).json({ success: false, message: 'Invalid role' });

  const emailError = await verifyEmailDomain(email);
  if (emailError) return res.status(400).json({ success: false, message: emailError });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const accessToken = crypto.randomBytes(16).toString('hex');
  const user   = await User.create({
    name, email, password: hashed, role,
    mustChangePassword: true,
    firstLoginToken: accessToken,
  });

  const resolvedEmployeeId = await generateUniqueEmployeeId();
  let employee;
  try {
    employee = await Employee.create({
      userId:        user._id,
      employeeId:    resolvedEmployeeId,
      dob:           dob           || undefined,
      gender:        gender        || undefined,
      maritalStatus: maritalStatus || undefined,
      designation:   designation   || undefined,
      department:    department    || undefined,
      section:       section       || undefined,
      salary:        salary        || 0,
    });
  } catch (empErr) {
    await User.findByIdAndDelete(user._id);
    throw empErr;
  }
  sendWelcomeEmail({
    name,
    email,
    password,          // raw password (before hashing)  needed for the email
    role,
    employeeId: resolvedEmployeeId,
    createdByName: req.user.name, // ← whichever admin triggered this request
  }).catch(err => console.error('[createUser] Welcome email failed:', err.message));
  await TechnicalLog.log({
    level:      'info',
    type:       'create_user',
    userId:     req.user._id,
    endpoint:   req.originalUrl,
    method:     req.method,
    statusCode: 201,
    message:    `Admin "${req.user.name}" created user "${name}" with role "${role}"`,
  });
  return res.status(201).json({
    success: true,
    message: 'User created and credentials emailed',
    user: {
      _id:        user._id,
      name, email, role,
      profileId:  employee._id,
      employeeId: employee.employeeId,
    },
    credentials: {
      email,
      tempPassword: password,
      accessToken,
      loginUrl: `${process.env.FRONTEND_URL || ''}/login`,
    },
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'employee'].includes(role))
    return res.status(400).json({ success: false, message: 'Invalid role' });

  const targetUser = await User.findOne({ _id: req.params.id, ...ACTIVE_USER });
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  if (targetUser.isPrimaryAdmin) {
    return res.status(403).json({ success: false, message: 'This account cannot be modified.' });
  }

  if (targetUser._id.toString() === req.user._id.toString() && role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Admins cannot change their own role to employee',
    });
  }

  targetUser.role = role;
  await targetUser.save();

  const user = await User.findById(targetUser._id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'admin_update_role',
    targetType: 'User',
    targetId:   user._id,
    detail:     `"${req.user.name}" changed role of "${user.name}" to "${role}"`,
  });

  return res.status(200).json({ success: true, message: 'Role updated', user });
});

const getUserCredentials = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({ _id: req.params.id, ...ACTIVE_USER })
    .select('name email mustChangePassword firstLoginToken isPrimaryAdmin');
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  if (targetUser.isPrimaryAdmin) {
    return res.status(403).json({ success: false, message: 'This account cannot be modified.' });
  }

  if (!targetUser.mustChangePassword) {
    return res.status(400).json({
      success: false,
      message: 'This user has already logged in and set their own password — credentials can no longer be viewed. Use Reset PW to issue new ones.',
    });
  }

  const employee = await Employee.findOne({ userId: targetUser._id }).select('employeeId');

  return res.status(200).json({
    success: true,
    credentials: {
      name: targetUser.name,
      email: targetUser.email,
      employeeId: employee?.employeeId ?? '',
      accessToken: targetUser.firstLoginToken ?? '',
      loginUrl: `${process.env.FRONTEND_URL || ''}/login`,
    },
  });
});

const adminResetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4)
    return res.status(400).json({ success: false, message: 'Password too short' });

  const targetUser = await User.findOne({ _id: req.params.id, ...ACTIVE_USER });  // fetch first to get email/name
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  if (targetUser.isPrimaryAdmin) {
    return res.status(403).json({ success: false, message: 'This account cannot be modified.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const accessToken = crypto.randomBytes(16).toString('hex');
  targetUser.password           = hashed;
  targetUser.mustChangePassword = true;
  targetUser.firstLoginToken    = accessToken;
  await targetUser.save();

  // Send email to the user with their new password — in the background, same reason as createUser
  sendPasswordResetEmail({
    name:        targetUser.name,
    email:       targetUser.email,
    newPassword: password,           // raw password for the email
    resetByName: req.user.name,      // which admin did the reset
  }).catch(err => console.error('[adminResetPassword] Email failed:', err.message));

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'admin_reset_password',
    targetType: 'User',
    targetId:   targetUser._id,
    detail:     `Admin reset password for "${targetUser.name}"`,
  });

  return res.status(200).json({
    success: true,
    message: 'Password reset and email sent',
    // One-time credentials, same shape as createUser's response — this is
    // the only time the new password/token can be viewed after this reset.
    credentials: {
      email: targetUser.email,
      tempPassword: password,
      accessToken,
      loginUrl: `${process.env.FRONTEND_URL || ''}/login`,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, ...ACTIVE_USER });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.isPrimaryAdmin) {
    return res.status(403).json({ success: false, message: 'This account cannot be modified.' });
  }

  user.archiveState = 'trash';
  user.archivedBy = req.user._id;
  user.archivedAt = new Date();
  await user.save();

  await Employee.findOneAndUpdate(
    { userId: req.params.id },
    { $set: { archiveState: 'trash', archivedBy: req.user._id, archivedAt: new Date() } }
  );

  await AuditLog.log({
    actorId:    req.user._id,
    action:     'admin_delete_user',
    targetType: 'User',
    targetId:   req.params.id,
    detail:     `"${req.user.name}" moved user "${user.name}" to trash`,
  });

  return res.status(200).json({ success: true, message: 'User moved to trash' });
});

module.exports = {
  getAllUsers, createUser, updateUserRole, adminResetPassword, deleteUser, getUserCredentials,
};