const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUserRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: 'Naveen3' });
        if (!user) {
            console.log('User Naveen3 not found');
        } else {
            console.log(`User: ${user.username}, Role: ${user.role}`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkUserRole();
