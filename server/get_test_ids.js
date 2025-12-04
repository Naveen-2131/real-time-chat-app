const mongoose = require('mongoose');
const Group = require('./models/Group');
require('dotenv').config();

const getTestIds = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const group = await Group.findOne({ 'members.1': { $exists: true } });

        if (!group) {
            console.log('No suitable group found');
            return;
        }

        const memberToRemove = group.members.find(m => m.toString() !== group.admin.toString()) || group.members[1];

        console.log(`GroupID: ${group._id}`);
        console.log(`MemberID: ${memberToRemove}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

getTestIds();
