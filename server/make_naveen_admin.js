const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const makeAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'Naveen';
        const user = await User.findOneAndUpdate(
            { username },
            { role: 'admin', isAdmin: true }, // Update both for compatibility
            { new: true }
        );

        if (!user) {
            console.log(`User '${username}' not found`);
        } else {
            console.log(`Updated User: ${user.username}`);
            console.log(`New Role: ${user.role}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

makeAdmin();
