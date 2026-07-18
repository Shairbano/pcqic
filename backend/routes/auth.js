const express    = require('express');
const router     = express.Router();
const { login, logout, verify, checkEmail, resetPasswordDirect, changePassword } = require('../controllers/authController');
const { verifyUser } = require('../middleware/authMiddleware');

router.post('/login',                  login);
router.post('/logout',   verifyUser,   logout);
router.get('/verify',    verifyUser,   verify);
router.post('/check-email',            checkEmail);
router.post('/reset-password-direct',  resetPasswordDirect);

// Force password change on first login
router.post('/change-password', verifyUser, changePassword);

module.exports = router;