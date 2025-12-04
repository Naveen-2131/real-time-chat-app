const User = require('../models/User');

module.exports = (io) => {
    const users = new Map(); // Map user ID to socket ID

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User joins with their ID
        socket.on('join', async (userId) => {
            users.set(userId, socket.id);
            // Store user info in socket for disconnect handling
            socket.userId = userId;

            // Update user's lastSeen and status in database
            try {
                await User.findByIdAndUpdate(userId, {
                    status: 'online',
                    lastSeen: new Date()
                });
            } catch (error) {
                console.error('Error updating user status:', error);
            }

            io.emit('user_status_change', { userId, status: 'online' });
            console.log(`User ${userId} is online`);
        });

        // Join a conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User joined conversation: ${conversationId}`);
        });

        // Leave a conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(conversationId);
        });

        // Send message
        socket.on('send_message', (message) => {
            const { conversationId, groupId } = message;
            const room = conversationId || groupId;

            if (room) {
                socket.to(room).emit('new_message', message);
            }
        });

        // Typing indicators
        socket.on('typing', (room) => {
            // Broadcast to room except sender
            socket.to(room).emit('typing', { room, user: socket.userId });
            // Note: In a real app, we'd want the username here. 
            // Since we only stored userId in socket.userId, we might need to fetch it or store it in join.
            // For now, let's assume the client sends the username or we just show "Someone is typing"
            // Actually, let's update the client to send the username in the join event or just use the userId to look up.
            // Better yet, let's trust the client to send the username in the typing event if we want it simple,
            // OR, let's update the join event to store username.
        });

        // Let's refine the typing event to match what ChatDashboard expects
        // ChatDashboard expects: socket.on('typing', ({ room, user: typingUsername }) => { ... })
        // So we should emit: { room, user: username }

        // Let's update the join listener to store username too
        socket.on('join_with_data', async ({ userId, username }) => {
            users.set(userId, socket.id);
            socket.userId = userId;
            socket.username = username;

            // Update lastSeen in database
            try {
                await User.findByIdAndUpdate(userId, {
                    status: 'online',
                    lastSeen: new Date()
                });
            } catch (error) {
                console.error('Error updating user status:', error);
            }

            io.emit('user_status_change', { userId, status: 'online' });
        });

        socket.on('typing', (room) => {
            if (socket.username) {
                socket.to(room).emit('typing', { room, user: socket.username });
            }
        });

        socket.on('stop_typing', (room) => {
            socket.to(room).emit('stop_typing', { room });
        });

        // Get online users list
        socket.on('get_online_users', () => {
            const onlineUserIds = Array.from(users.keys());
            socket.emit('online_users_list', onlineUserIds);
        });

        // Disconnect
        socket.on('disconnect', async () => {
            let userId = socket.userId;

            // Fallback if socket.userId wasn't set (should be set in join)
            if (!userId) {
                for (const [key, value] of users.entries()) {
                    if (value === socket.id) {
                        userId = key;
                        break;
                    }
                }
            }

            if (userId) {
                users.delete(userId);

                // Update user's lastSeen and status in database
                try {
                    await User.findByIdAndUpdate(userId, {
                        status: 'offline',
                        lastSeen: new Date()
                    });
                } catch (error) {
                    console.error('Error updating user lastSeen:', error);
                }

                io.emit('user_status_change', { userId, status: 'offline' });
            }
            console.log('User disconnected:', socket.id);
        });
    });
};
