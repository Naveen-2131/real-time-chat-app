const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUserRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'Naveen'; // The user in the screenshot
        const user = await User.findOne({ username });

        if (!user) {
            console.log(`User '${username}' not found`);
        } else {
            console.log(`User: ${user.username}`);
            console.log(`Role: ${user.role}`);
            console.log(`IsAdmin: ${user.isAdmin}`); // Check legacy field too if exists
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkUserRole();
