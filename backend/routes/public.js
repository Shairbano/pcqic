const express = require('express');
const router = express.Router();
const {
  getPublicOverview,
  getPublicGroups,
  getPublicAdmins,
  contactAdmin,
} = require('../controllers/publicController');

router.get('/overview', getPublicOverview);
router.get('/groups', getPublicGroups);
router.get('/admins', getPublicAdmins);
router.post('/contact-admin', contactAdmin);

module.exports = router;
