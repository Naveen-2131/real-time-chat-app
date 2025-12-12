const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    updateUserStatus,
    searchUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/search', protect, searchUsers);
router.get('/profile/:id', protect, getUserProfile);
router.put('/profile', protect, (req, res, next) => {
    console.log('🔥🔥🔥 PROFILE UPDATE ROUTE HIT 🔥🔥🔥');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    next();
}, upload, updateUserProfile);
router.put('/status', protect, updateUserStatus);

module.exports = router;
