const User         = require('../../models/user');
const asyncHandler = require('../../utils/asyncHandler');

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2)
    return res.status(400).json({ success: false, message: 'Query too short' });

  const users = await User.find({
    archiveState: { $ne: 'trash' },
    $or: [
      { name:  { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
    _id: { $ne: req.user._id },
  }).select('name email _id role').limit(10);

  return res.status(200).json({ success: true, users });
});

module.exports = { searchUsers };