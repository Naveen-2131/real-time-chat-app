const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/chat-app')
    .then(async () => {
        const users = await User.find({}, 'username lastSeen status').sort({ lastSeen: -1 });
        console.log('Users and their lastSeen:');
        console.log('Current time:', new Date());
        console.log('---');
        users.forEach(u => {
            const diffMs = new Date() - new Date(u.lastSeen);
            const diffMins = Math.floor(diffMs / 60000);
            console.log(`${u.username}:`);
            console.log(`  lastSeen: ${u.lastSeen}`);
            console.log(`  status: ${u.status}`);
            console.log(`  minutes ago: ${diffMins}`);
            console.log('---');
        });
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
