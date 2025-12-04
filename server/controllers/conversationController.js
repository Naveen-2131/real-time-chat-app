const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Create or access a one-on-one conversation
// @route   POST /api/conversations
// @access  Private
const accessConversation = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'UserId param not sent with request' });
    }

    var isChat = await Conversation.find({
        $and: [
            { participants: { $elemMatch: { $eq: req.user.id } } },
            { participants: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate('participants', 'username email profilePicture bio customStatus lastSeen status')
        .populate('lastMessage');

    isChat = await User.populate(isChat, {
        path: 'lastMessage.sender',
        select: 'username profilePicture email lastSeen status',
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            participants: [req.user.id, userId],
        };

        try {
            const createdChat = await Conversation.create(chatData);
            const FullChat = await Conversation.findOne({ _id: createdChat._id }).populate(
                'participants',
                'username email profilePicture bio customStatus lastSeen status'
            );
            res.status(200).json(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
};

// @desc    Fetch all conversations for a user
// @route   GET /api/conversations
// @access  Private
const fetchConversations = async (req, res) => {
    try {
        Conversation.find({ participants: { $elemMatch: { $eq: req.user.id } } })
            .populate('participants', 'username email profilePicture bio customStatus lastSeen status')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: 'lastMessage.sender',
                    select: 'username profilePicture email lastSeen status',
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

module.exports = {
    accessConversation,
    fetchConversations,
};
