const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/chat-app')
    .then(async () => {
        console.log('Updating user to admin...');

        // Find user by email (assuming Naveen@gmail.com from previous context)
        const user = await User.findOneAndUpdate(
            { email: 'naveen@gmail.com' },
            { role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log(`User ${user.username} is now an admin.`);
        } else {
            console.log('User not found.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
