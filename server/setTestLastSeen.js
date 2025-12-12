const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/chat-app')
    .then(async () => {
        console.log('Setting test data for lastSeen...');

        // Set some users to have old lastSeen times
        const users = await User.find({});

        if (users.length >= 2) {
            // Set first user to 5 minutes ago
            await User.findByIdAndUpdate(users[0]._id, {
                lastSeen: new Date(Date.now() - 5 * 60 * 1000),
                status: 'offline'
            });
            console.log(`Set ${users[0].username} to 5 minutes ago`);

            // Set second user to 2 hours ago
            if (users[1]) {
                await User.findByIdAndUpdate(users[1]._id, {
                    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    status: 'offline'
                });
                console.log(`Set ${users[1].username} to 2 hours ago`);
            }

            // Set third user to yesterday
            if (users[2]) {
                await User.findByIdAndUpdate(users[2]._id, {
                    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    status: 'offline'
                });
                console.log(`Set ${users[2].username} to yesterday`);
            }

            // Keep fourth user as recently online (30 seconds ago)
            if (users[3]) {
                await User.findByIdAndUpdate(users[3]._id, {
                    lastSeen: new Date(Date.now() - 30 * 1000),
                    status: 'online'
                });
                console.log(`Set ${users[3].username} to 30 seconds ago (should show as Online)`);
            }
        }

        console.log('\nDone! Now check the UI.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
