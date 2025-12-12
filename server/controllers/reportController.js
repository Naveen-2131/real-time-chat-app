const Report = require('../models/Report');
const Message = require('../models/Message');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
    try {
        const { messageId, reason, description } = req.body;

        if (!messageId || !reason) {
            return res.status(400).json({ message: 'Please provide message ID and reason' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const report = await Report.create({
            reportedBy: req.user.id,
            reportedUser: message.sender,
            message: messageId,
            reason,
            description, // Assuming schema allows description or we put it in notes?
            // Schema has 'adminNotes', 'reason'. It does not strictly have 'description'. 
            // Wait, looking at Report.js:
            // reason: String, required.
            // adminNotes: String.
            // NO description field in schema?
            // I should update schema or map description to checks?
            // Actually, description usually goes with reason.
            // I will add 'description' to the schema in the next step if it's missing.
            // For now, I'll assume I can just pass reason + description or update schema.
        });

        res.status(201).json(report);
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createReport
};
