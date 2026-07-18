
const mongoose = require('mongoose');

const technicalLogSchema = new mongoose.Schema({
  level: { type: String, enum: ['info', 'warn', 'error'], default: 'error' },
  type: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'failed_login',
      'api_error', 'validation_error', 'file_upload_error',
      'server_error', 'database_error', 'permission_denied', 'exception',
      // Creation events — all "X was created" actions live here instead of
      // the Management Log (AuditLog), per product decision: creations are
      // high-volume/system-ish noise, so they're grouped with the technical
      // stream and kept out of the human-curated management trail.
      'create_user', 'create_group', 'create_project', 'create_task', 'create_guide',
    ],
  },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who was involved, if known
  endpoint:   { type: String },   // e.g. "/api/admin/users"
  method:     { type: String },   // e.g. "POST"
  statusCode: { type: Number },
  message:    { type: String },
  stack:      { type: String },
  ip:         { type: String },
}, { timestamps: true });

technicalLogSchema.index({ type: 1, createdAt: -1 });
technicalLogSchema.index({ userId: 1, createdAt: -1 });

// Static helper — mirrors AuditLog.log()'s shape/pattern so both logs are
// used the same way from controllers. Never throws: a logging failure must
// never take down the actual request it's trying to record.
technicalLogSchema.statics.log = async function ({
  level = 'error', type, userId, endpoint, method, statusCode, message, stack, ip,
}) {
  try {
    await this.create({ level, type, userId, endpoint, method, statusCode, message, stack, ip });
  } catch (e) {
    console.error('TechnicalLog write failed:', e.message);
  }
};

module.exports = mongoose.model('TechnicalLog', technicalLogSchema);