const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  text:  { type: String, required: true, trim: true },
  image: { type: String }, // optional, base64 data URL, same convention as coverPhoto
}, { _id: false });

const guideHelpSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  // New authoring format: an ordered list of steps, each with its own text
  // + optional image. Replaces the old single `content` string.
  steps: { type: [stepSchema], default: [] },
 
  content: { type: String, trim: true },
  image:   { type: String },
  category: {
    type: String,
    enum: [
      'Getting Started',
      'Account',
      'Groups',
      'Projects',
      'Tasks',
      'Locked Items',
      'Other',
    ],
    default: 'Getting Started',
  },
  // Controls display order within a category — lower shows first.
  order: { type: Number, default: 0 },
  // Lets an admin save a draft without it appearing on the user dashboard yet.
  isPublished: { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

guideHelpSchema.index({ category: 1, order: 1 });
guideHelpSchema.index({ isPublished: 1 });

module.exports = mongoose.model('GuideHelp', guideHelpSchema);