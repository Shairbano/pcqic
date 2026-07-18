
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:      { type: String, required: true }, // e.g. "approved_group", "reset_password"
  targetType:  { type: String, enum: ['User', 'Group', 'Project', 'Task', 'Guide'] },
  targetId:    { type: mongoose.Schema.Types.ObjectId },
  detail:      { type: String }, // human-readable description
  ip:          { type: String },
  beforeValue: { type: mongoose.Schema.Types.Mixed },
  afterValue:  { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

auditLogSchema.statics.log = async function ({
  actorId, action, targetType, targetId, detail, ip, beforeValue, afterValue,
}) {
  try {
    await this.create({ actorId, action, targetType, targetId, detail, ip, beforeValue, afterValue });
  } catch (e) {
    console.error('AuditLog write failed:', e.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);