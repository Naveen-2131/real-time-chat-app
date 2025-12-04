const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        console.log('=== UPDATE PROFILE REQUEST ===');
        console.log('User ID:', req.user?.id);
        console.log('Body:', req.body);
        console.log('File:', req.file);
        console.log('Files:', req.files);

        const user = await User.findById(req.user.id);

        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ message: 'User not found' });
        }

        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.customStatus = req.body.customStatus || user.customStatus;
        user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;

        // Handle avatar upload
        if (req.file) {
            console.log('Processing file upload:', req.file.filename);
            user.profilePicture = `/uploads/${req.file.filename}`;
        }

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();
        console.log('Profile updated successfully');

        res.json({
            _id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            profilePicture: updatedUser.profilePicture,
            customStatus: updatedUser.customStatus,
            bio: updatedUser.bio,
            role: updatedUser.role,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
};

// @desc    Update user status
// @route   PUT /api/users/status
// @access  Private
const updateUserStatus = async (req, res) => {
    const { status } = req.body;
    const user = await User.findById(req.user.id);

    if (user) {
        user.status = status;
        await user.save();
        res.json({ message: 'Status updated', status: user.status });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                { username: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
            ],
        }
        : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user.id } }).select('-password');
    res.json(users);
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserStatus,
    searchUsers,
};
