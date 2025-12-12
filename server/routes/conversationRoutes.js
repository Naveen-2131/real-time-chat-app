const express = require('express');
const router = express.Router();
const {
    accessConversation,
    fetchConversations,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, accessConversation);
router.route('/').get(protect, fetchConversations);

module.exports = router;
