const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Create a group chat
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: 'Please Fill all the fields' });
    }

    var users = req.body.users;

    // Handle if users is sent as string (from FormData or JSON stringify)
    if (typeof users === 'string') {
        try {
            users = JSON.parse(users);
        } catch (error) {
            return res.status(400).send({ message: 'Invalid users format' });
        }
    }

    if (users.length < 2) {
        return res
            .status(400)
            .send('More than 2 users are required to form a group chat');
    }

    users.push(req.user);

    try {
        const groupChat = await Group.create({
            name: req.body.name,
            users: users,
            admin: req.user,
            members: users
        });

        const fullGroupChat = await Group.findOne({ _id: groupChat._id })
            .populate('members', '-password')
            .populate('admin', '-password');

        res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error('Create Group Error:', error);
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Fetch all groups for a user
// @route   GET /api/groups
// @access  Private
const fetchGroups = async (req, res) => {
    try {
        Group.find({ members: { $elemMatch: { $eq: req.user.id } } })
            .populate('members', '-password')
            .populate('admin', '-password')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: 'lastMessage.sender',
                    select: 'username profilePicture email',
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Rename Group
// @route   PUT /api/groups/:id
// @access  Private
const renameGroup = async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;

    const updatedChat = await Group.findByIdAndUpdate(
        id,
        { name: name },
        { new: true }
    )
        .populate('members', '-password')
        .populate('admin', '-password');

    if (!updatedChat) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(updatedChat);
    }
};

// @desc    Add user to Group
// @route   POST /api/groups/:id/members
// @access  Private
const addToGroup = async (req, res) => {
    const { userId } = req.body;
    const { id } = req.params;

    console.log(`Adding user ${userId} to group ${id}`);

    // Check if user is already in group
    const group = await Group.findById(id);
    if (!group) {
        return res.status(404).json({ message: 'Chat Not Found' });
    }

    console.log('Current members:', group.members);

    // Check if user is already in group (compare strings)
    if (group.members.some(member => member.toString() === userId)) {
        console.log('User already in group');
        return res.status(400).json({ message: 'User already in group' });
    }

    const added = await Group.findByIdAndUpdate(
        id,
        { $push: { members: userId } },
        { new: true }
    )
        .populate('members', '-password')
        .populate('admin', '-password');

    if (!added) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(added);
    }
};

// @desc    Remove user from Group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
const removeFromGroup = async (req, res) => {
    const { userId } = req.params;
    const { id } = req.params;

    console.log(`[DEBUG] removeFromGroup called. GroupID: ${id}, UserID: ${userId}`);
    console.log(`[DEBUG] Request Params:`, req.params);

    // Verify group exists first
    const group = await Group.findById(id);
    if (!group) {
        return res.status(404).json({ message: 'Chat Not Found' });
    }
    console.log('Current members before remove:', group.members);

    const removed = await Group.findByIdAndUpdate(
        id,
        { $pull: { members: userId } },
        { new: true }
    )
        .populate('members', '-password')
        .populate('admin', '-password');

    if (!removed) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(removed);
    }
};

module.exports = {
    createGroup,
    fetchGroups,
    renameGroup,
    addToGroup,
    removeFromGroup,
};
