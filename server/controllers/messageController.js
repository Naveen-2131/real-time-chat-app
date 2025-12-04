const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        console.log('=== SEND MESSAGE REQUEST ===');
        console.log('User ID:', req.user?.id);
        console.log('Body:', req.body);
        console.log('File:', req.file);
        console.log('Files:', req.files);

        if (!req.user || !req.user.id) {
            console.error('User not authenticated');
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { content, conversationId, groupId } = req.body;
        let fileData = {};

        if (req.file) {
            console.log('Processing file:', req.file.filename);
            fileData = {
                fileUrl: `/uploads/${req.file.filename}`,
                fileType: req.file.mimetype.split('/')[0], // 'image', 'video', etc.
                fileName: req.file.originalname,
                fileSize: req.file.size
            };
        }

        if (!content && !req.file) {
            console.log('No content or file provided');
            return res.status(400).json({ message: 'Message must have content or a file' });
        }

        // Ensure content is not undefined when creating message
        const messageContent = content && content.trim() ? content.trim() : '';

        var newMessage = {
            sender: req.user.id,
            content: messageContent,
            conversation: conversationId,
            group: groupId,
            ...fileData
        };

        console.log('Creating message:', newMessage);
        var message = await Message.create(newMessage);

        message = await message.populate('sender', 'username profilePicture');

        if (conversationId) {
            message = await message.populate('conversation');
            message = await User.populate(message, {
                path: 'conversation.participants',
                select: 'username profilePicture email',
            });
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message });
        } else if (groupId) {
            message = await message.populate('group');
            await Group.findByIdAndUpdate(groupId, { lastMessage: message });
        }

        console.log('Message sent successfully');
        res.json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};

// @desc    Get all messages for a conversation
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({ conversation: req.params.conversationId })
            .populate('sender', 'username profilePicture email')
            .populate('conversation');
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Get all messages for a group
// @route   GET /api/messages/group/:groupId
// @access  Private
const allGroupMessages = async (req, res) => {
    try {
        const messages = await Message.find({ group: req.params.groupId })
            .populate('sender', 'username profilePicture email')
            .populate('group');
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

module.exports = {
    sendMessage,
    allMessages,
    allGroupMessages,
};
