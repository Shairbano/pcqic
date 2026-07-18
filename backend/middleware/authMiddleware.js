const jwt      = require('jsonwebtoken');
const User     = require('../models/user.js');
const Employee = require('../models/Employee.js');

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token', success: false });

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY || process.env.JWT_SECRET);

    const user = await User.findOne({ _id: decoded._id, archiveState: { $ne: 'trash' } }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found', success: false });

    const employee = await Employee.findOne({ userId: user._id, archiveState: { $ne: 'trash' } });

    req.user = {
      _id:               user._id,
      name:              user.name,
      email:             user.email,
      role:              user.role,
      profileId:         employee ? employee._id : null,
      employeeId:        employee ? employee.employeeId : '',
      mustChangePassword: user.mustChangePassword ?? false,
    };

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = { verifyUser };
