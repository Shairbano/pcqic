// controllers/guideController.js
// Place in: backend/controllers/guideController.js

const GuideHelp    = require('../models/GuideHelp');
const AuditLog     = require('../models/AuditLog');
const TechnicalLog = require('../models/TechnicalLog');

const CATEGORIES = [
  'Getting Started', 'Account', 'Groups', 'Projects', 'Tasks', 'Locked Items', 'Other',
];

// A submitted `steps` array is valid if it's an array containing at least
// one step with non-empty text (empty/whitespace-only steps are dropped).
const cleanSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  return steps
    .filter(s => s && typeof s.text === 'string' && s.text.trim())
    .map(s => ({ text: s.text.trim(), image: s.image || undefined }));
};

// ─────────────────────────────────────────────
// GET /api/guides
// Everyone logged in can read. Admins see every entry (including drafts,
// so they can preview before publishing); employees only see published ones.
// ─────────────────────────────────────────────
const getGuides = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isPublished: true };
    const guides = await GuideHelp.find(filter)
      .sort({ category: 1, order: 1, createdAt: 1 })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    return res.status(200).json({ success: true, guides });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/guides   (admin only)
// ─────────────────────────────────────────────
const createGuide = async (req, res) => {
  try {
    const { title, content, category, order, isPublished, image, steps } = req.body;
    const cleanedSteps = cleanSteps(steps);

    if (!title?.trim())
      return res.status(400).json({ success: false, message: 'Title is required' });
    if (cleanedSteps.length === 0 && !content?.trim())
      return res.status(400).json({ success: false, message: 'Add at least one step' });
    if (category && !CATEGORIES.includes(category))
      return res.status(400).json({ success: false, message: 'Invalid category' });

    const guide = await GuideHelp.create({
      title:       title.trim(),
      steps:       cleanedSteps,
      content:     content?.trim() || undefined,
      category:    category || 'Getting Started',
      order:       Number.isFinite(order) ? order : 0,
      isPublished: isPublished ?? true,
      image:       image || undefined,
      createdBy:   req.user._id,
    });

    // Creations go to the Technical Log, not the Management Log — see
    // models/TechnicalLog.js for the reasoning.
    await TechnicalLog.log({
      level: 'info', type: 'create_guide', userId: req.user._id,
      endpoint: req.originalUrl, method: req.method, statusCode: 201,
      message: `Admin "${req.user.name}" added guide "${guide.title}"`,
    });

    return res.status(201).json({ success: true, message: 'Guide added', guide });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/guides/:id   (admin only)
// ─────────────────────────────────────────────
const updateGuide = async (req, res) => {
  try {
    const { title, content, category, order, isPublished, image, steps } = req.body;

    const guide = await GuideHelp.findById(req.params.id);
    if (!guide) return res.status(404).json({ success: false, message: 'Guide not found' });

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      guide.title = title.trim();
    }
    if (steps !== undefined) {
      const cleanedSteps = cleanSteps(steps);
      if (cleanedSteps.length === 0 && !(content ?? guide.content)?.trim())
        return res.status(400).json({ success: false, message: 'Add at least one step' });
      guide.steps = cleanedSteps;
    }
    if (content !== undefined) {
      guide.content = content.trim() || undefined;
    }
    if (category !== undefined) {
      if (!CATEGORIES.includes(category))
        return res.status(400).json({ success: false, message: 'Invalid category' });
      guide.category = category;
    }
    if (order !== undefined && Number.isFinite(order)) guide.order = order;
    if (isPublished !== undefined) guide.isPublished = !!isPublished;
    // image === '' or null means "remove the image"; undefined means "leave as-is"
    if (image !== undefined) guide.image = image || undefined;
    guide.updatedBy = req.user._id;

    await guide.save();

    await AuditLog.log({
      actorId:    req.user._id,
      action:     'admin_update_guide',
      targetType: 'Guide',
      targetId:   guide._id,
      detail:     `Admin "${req.user.name}" updated guide "${guide.title}"`,
    });

    return res.status(200).json({ success: true, message: 'Guide updated', guide });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/guides/:id   (admin only)
// ─────────────────────────────────────────────
const deleteGuide = async (req, res) => {
  try {
    const guide = await GuideHelp.findById(req.params.id);
    if (!guide) return res.status(404).json({ success: false, message: 'Guide not found' });

    await guide.deleteOne();

    await AuditLog.log({
      actorId:    req.user._id,
      action:     'admin_delete_guide',
      targetType: 'Guide',
      targetId:   guide._id,
      detail:     `Admin "${req.user.name}" deleted guide "${guide.title}"`,
    });

    return res.status(200).json({ success: true, message: 'Guide deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getGuides, createGuide, updateGuide, deleteGuide, CATEGORIES };