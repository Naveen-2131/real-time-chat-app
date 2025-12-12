const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Report = require('../models/Report');

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;

        const keyword = req.query.keyword
            ? {
                $or: [
                    { username: { $regex: req.query.keyword, $options: 'i' } },
                    { email: { $regex: req.query.keyword, $options: 'i' } },
                ],
            }
            : {};

        const count = await User.countDocuments({ ...keyword });
        const users = await User.find({ ...keyword })
            .select('-password')
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ users, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Activate/Deactivate user
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.isActive = req.body.isActive;
            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Get all groups (Admin)
// @route   GET /api/admin/groups
// @access  Private/Admin
const getAllGroups = async (req, res) => {
    try {
        const groups = await Group.find({})
            .populate('admin', 'username email')
            .populate('members', 'username');
        res.json(groups);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Delete group (Admin)
// @route   DELETE /api/admin/groups/:id
// @access  Private/Admin
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (group) {
            await group.deleteOne();
            res.json({ message: 'Group removed' });
        } else {
            res.status(404);
            throw new Error('Group not found');
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const getAllReports = async (req, res) => {
    try {
        const reports = await Report.find({})
            .populate('reportedBy', 'username')
            .populate('reportedUser', 'username')
            .populate('message');
        res.json(reports);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Update report status
// @route   PUT /api/admin/reports/:id
// @access  Private/Admin
const updateReportStatus = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (report) {
            report.status = req.body.status || report.status;
            report.adminNotes = req.body.adminNotes || report.adminNotes;
            const updatedReport = await report.save();
            res.json(updatedReport);
        } else {
            res.status(404);
            throw new Error('Report not found');
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalGroups = await Group.countDocuments({});
        const totalMessages = await Message.countDocuments({});

        // Simple analytics for now
        res.json({
            totalUsers,
            activeUsers,
            totalGroups,
            totalMessages
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

module.exports = {
    getAllUsers,
    updateUserStatus,
    getAllGroups,
    deleteGroup,
    getAllReports,
    updateReportStatus,
    getAnalytics
};
