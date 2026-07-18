
const express = require('express');
const router  = express.Router();
const { verifyUser } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../controllers/adminController');
const { getGuides, createGuide, updateGuide, deleteGuide } = require('../controllers/guideController');

// Must be logged in to read or write
router.use(verifyUser);

// Read — both admin and employee (controller filters drafts for employees)
router.get('/', getGuides);

// Write — admin only
router.post('/',     requireAdmin, createGuide);
router.patch('/:id', requireAdmin, updateGuide);
router.delete('/:id', requireAdmin, deleteGuide);

module.exports = router;