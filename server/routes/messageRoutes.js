const express = require('express');
const router = express.Router();
const {
    sendMessage,
    allMessages,
    allGroupMessages,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


router.route('/').post(protect, (req, res, next) => {
    console.log('🔥🔥🔥 MESSAGE ROUTE HIT 🔥🔥🔥');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
}, upload, sendMessage);
router.route('/conversation/:conversationId').get(protect, allMessages);
router.route('/group/:groupId').get(protect, allGroupMessages);

module.exports = router;
