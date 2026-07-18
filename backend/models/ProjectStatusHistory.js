 

const mongoose = require('mongoose');

const projectStatusHistorySchema = new mongoose.Schema({
  projectId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  previousStatus: { type: String },
  newStatus:      { type: String, required: true },
  changedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  remarks:        { type: String },
}, { timestamps: true }); // createdAt doubles as the recorded date+time of the change

projectStatusHistorySchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectStatusHistory', projectStatusHistorySchema);