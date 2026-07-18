const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  email:              { type: String, required: true, unique: true },
  password:           { type: String, required: true },
  role:               { type: String, required: true, enum: ['admin', 'employee'] },
  // Marks the single seeded "root" admin account created by userSeed.js.
  // This account still logs in and works normally — it's just excluded
  // from the User Management list so other admins can't see, demote, or
  // trash it. Never set anywhere except userSeed.js.
  isPrimaryAdmin:     { type: Boolean, default: false },
  profileImage:       { type: String },
  mustChangePassword: { type: Boolean, default: false },
  // One-time access token shown to the admin at creation time, alongside the
  // temp password. Cleared the moment the user completes their first login.
  firstLoginToken:    { type: String },
  archiveState:       { type: String, enum: ['active', 'trash', 'locked'], default: 'active' },
  archivedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  archivedAt:         { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);