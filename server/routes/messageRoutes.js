const express = require('express');
const router = express.Router();
const {
    sendMessage,
    allMessages,
    allGroupMessages,
    markAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


router.route('/').post(protect, upload, sendMessage);
router.route('/conversation/:conversationId').get(protect, allMessages);
router.route('/group/:groupId').get(protect, allGroupMessages);
router.route('/mark-read/conversation/:conversationId').put(protect, markAsRead);
router.route('/mark-read/group/:groupId').put(protect, markAsRead);

module.exports = router;
