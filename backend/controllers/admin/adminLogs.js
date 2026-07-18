const User          = require('../../models/user');
const AuditLog       = require('../../models/AuditLog');
const TechnicalLog   = require('../../models/TechnicalLog');
const asyncHandler   = require('../../utils/asyncHandler');

const buildFuzzyRegex = (raw) => {
  const escaped = raw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const pattern = escaped.replace(/[\s_]+/g, '[\\s_]+');
  return new RegExp(pattern, 'i');
};

const TARGET_KEYWORDS = ['group', 'project', 'user', 'task'];

const getAuditLog = asyncHandler(async (req, res) => {
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 50;
  const skip   = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  let query = {};
  if (search) {
    const normalized = search.toLowerCase();
    if (TARGET_KEYWORDS.includes(normalized)) {
      query = { targetType: new RegExp(`^${normalized}$`, 'i') };
    } else {
      const regex = buildFuzzyRegex(search);
      const matchingActors = await User.find({ name: regex }).select('_id');
      const actorIds = matchingActors.map(u => u._id);
      query = {
        $or: [
          { action:     regex },
          { detail:     regex },
          { targetType: regex },
          ...(actorIds.length ? [{ actorId: { $in: actorIds } }] : []),
        ],
      };
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return res.status(200).json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
});

// TECHNICAL LOG (Feature #4B) — separate collection/model from AuditLog above.
const getTechnicalLog = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip  = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  const filter = {};
  if (req.query.type)  filter.type  = req.query.type;
  if (req.query.level) filter.level = req.query.level;

  if (search) {
    const regex = buildFuzzyRegex(search);
    const matchingUsers = await User.find({ name: regex }).select('_id');
    const userIds = matchingUsers.map(u => u._id);
    filter.$or = [
      { type:     regex },
      { message:  regex },
      { endpoint: regex },
      ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ];
  }

  const [logs, total] = await Promise.all([
    TechnicalLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TechnicalLog.countDocuments(filter),
  ]);

  return res.status(200).json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
});

// DELETE /api/admin/audit-log — permanently wipe every management-log entry
const clearAuditLog = asyncHandler(async (req, res) => {
  const result = await AuditLog.deleteMany({});
  return res.status(200).json({ success: true, message: 'Management log cleared', deletedCount: result.deletedCount });
});

// DELETE /api/admin/technical-log — permanently wipe every technical-log entry
const clearTechnicalLog = asyncHandler(async (req, res) => {
  const result = await TechnicalLog.deleteMany({});
  return res.status(200).json({ success: true, message: 'Technical log cleared', deletedCount: result.deletedCount });
});

module.exports = { getAuditLog, getTechnicalLog, clearAuditLog, clearTechnicalLog };