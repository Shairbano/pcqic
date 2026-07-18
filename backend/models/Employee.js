const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId:    { type: String, required: true, unique: true },
  archiveState:  { type: String, enum: ['active', 'trash', 'locked'], default: 'active' },
  archivedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt:    { type: Date },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Employee', employeeSchema);
