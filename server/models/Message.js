const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    content: {
        type: String,
        default: ''
    },
    fileUrl: {
        type: String
    },
    fileType: {
        type: String,
        enum: ['image', 'video', 'document', 'none'],
        default: 'none'
    },
    fileName: String,
    fileSize: Number,
    isRead: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
