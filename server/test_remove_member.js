const mongoose = require('mongoose');
const Group = require('./models/Group');
const User = require('./models/User');
require('dotenv').config();

const testRemoveMember = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a group and a member to remove
        // Ideally, find a group with at least 2 members
        const group = await Group.findOne({ 'members.1': { $exists: true } });

        if (!group) {
            console.log('No suitable group found for testing');
            return;
        }

        console.log(`Testing with Group: ${group.name} (${group._id})`);
        console.log('Initial Members:', group.members);

        // Pick a member to remove (not the admin preferably, but for test it's fine)
        const memberToRemove = group.members.find(m => m.toString() !== group.admin.toString()) || group.members[1];

        if (!memberToRemove) {
            console.log('No member found to remove');
            return;
        }

        console.log(`Removing Member: ${memberToRemove}`);

        // 2. Perform Removal using STRING ID (simulating req.params)
        const memberIdString = memberToRemove.toString();
        console.log(`Removing Member ID (String): ${memberIdString}`);

        const updatedGroup = await Group.findByIdAndUpdate(
            group._id,
            { $pull: { members: memberIdString } },
            { new: true }
        );

        console.log('Updated Members:', updatedGroup.members);

        if (updatedGroup.members.some(m => m.toString() === memberToRemove.toString())) {
            console.log('FAILED: Member was NOT removed');
        } else {
            console.log('SUCCESS: Member was removed');

            // Re-add the member to restore state
            await Group.findByIdAndUpdate(
                group._id,
                { $push: { members: memberToRemove } }
            );
            console.log('Restored state (re-added member)');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testRemoveMember();
