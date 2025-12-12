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
            console.log('Processing file:', req.file.originalname);
            console.log('File path:', req.file.path);

            const fileUrl = `/uploads/${req.file.filename}`;

            fileData = {
                fileUrl: fileUrl,
                fileType: req.file.mimetype.split('/')[0], // 'image', 'video', etc.
                fileName: req.file.originalname,
                fileSize: req.file.size
            };
            console.log('File saved to disk:', fileUrl);
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



            // Update last message and increment unread count for other participants
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                conversation.lastMessage = message;

                // Initialize unreadCount if it doesn't exist (for old conversations)
                if (!conversation.unreadCount) {
                    conversation.unreadCount = new Map();
                }

                // Increment unread count for all participants except sender
                conversation.participants.forEach(participantId => {
                    if (participantId.toString() !== req.user.id) {
                        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
                        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
                    }
                });

                await conversation.save();
            }
        } else if (groupId) {
            message = await message.populate('group');

            // Update last message and increment unread count for other members
            const group = await Group.findById(groupId);
            if (group) {
                group.lastMessage = message;

                // Initialize unreadCount if it doesn't exist (for old groups)
                if (!group.unreadCount) {
                    group.unreadCount = new Map();
                }

                // Increment unread count for all members except sender
                group.members.forEach(memberId => {
                    if (memberId.toString() !== req.user.id) {
                        const currentCount = group.unreadCount.get(memberId.toString()) || 0;
                        group.unreadCount.set(memberId.toString(), currentCount + 1);
                    }
                });

                await group.save();
            }
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversation: req.params.conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'username profilePicture email')
            .populate('conversation');

        res.json(messages.reverse()); // Reverse to show oldest first
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ group: req.params.groupId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'username profilePicture email')
            .populate('group');

        res.json(messages.reverse()); // Reverse to show oldest first
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Mark messages as read (reset unread count)
// @route   PUT /api/messages/mark-read/:conversationId
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { conversationId, groupId } = req.params;

        if (conversationId) {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                // Initialize unreadCount if it doesn't exist (for old conversations)
                if (!conversation.unreadCount) {
                    conversation.unreadCount = new Map();
                }
                console.log('Marking as read for user:', req.user.id);
                console.log('Current unreadCount keys:', Array.from(conversation.unreadCount.keys()));
                conversation.unreadCount.set(req.user.id, 0);
                conversation.markModified('unreadCount');
                await conversation.save();
            }
        } else if (groupId) {
            const group = await Group.findById(groupId);
            if (group) {
                // Initialize unreadCount if it doesn't exist (for old groups)
                if (!group.unreadCount) {
                    group.unreadCount = new Map();
                }
                group.unreadCount.set(req.user.id, 0);
                group.markModified('unreadCount');
                await group.save();
            }
        }

        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.sendMessage = sendMessage;
exports.allMessages = allMessages;
exports.allGroupMessages = allGroupMessages;
exports.markAsRead = markAsRead;
