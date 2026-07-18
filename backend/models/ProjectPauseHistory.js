

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  authorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment:           { type: String },
  suggestedSolution: { type: String },
}, { timestamps: true });

const projectPauseHistorySchema = new mongoose.Schema({
  projectId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  pausedBy:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pauseReason:            { type: String, required: true },
  description:            { type: String, required: true },
  expectedResolutionDate: { type: Date },
  pausedAt:               { type: Date, default: Date.now },
  comments:               [commentSchema], // admin review comments / suggested solutions while paused
  resolvedBy:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedSolution:       { type: String },
  resumedAt:              { type: Date },
  status:                 { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true });

projectPauseHistorySchema.index({ projectId: 1, createdAt: -1 });
projectPauseHistorySchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('ProjectPauseHistory', projectPauseHistorySchema);