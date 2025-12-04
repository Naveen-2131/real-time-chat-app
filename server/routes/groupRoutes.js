const express = require('express');
const router = express.Router();
const {
    createGroup,
    fetchGroups,
    renameGroup,
    addToGroup,
    removeFromGroup,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createGroup);
router.route('/').get(protect, fetchGroups);
router.route('/:id').put(protect, renameGroup);
router.route('/:id/members').post(protect, addToGroup);
router.route('/:id/members/:userId').delete(protect, removeFromGroup);

module.exports = router;
