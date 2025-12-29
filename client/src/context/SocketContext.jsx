import { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        if (user) {
            const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
            console.log('[SOCKET] Connecting to:', socketUrl);

            const newSocket = io(socketUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('[SOCKET] Connected:', newSocket.id);
                newSocket.emit('join_with_data', { userId: user._id, username: user.username });
            });

            newSocket.on('connect_error', (error) => {
                console.error('[SOCKET] Connection error:', error.message);
                console.error('[SOCKET] Make sure backend supports WebSocket connections');
            });

            newSocket.on('disconnect', (reason) => {
                console.log('[SOCKET] Disconnected:', reason);
                if (reason === 'io server disconnect') {
                    // Server disconnected, manually reconnect
                    newSocket.connect();
                }
            });

            newSocket.on('user_status_change', ({ userId, status }) => {
                // Handle online/offline status updates
                console.log(`User ${userId} is ${status}`);
            });

            setSocket(newSocket);

            return () => {
                console.log('[SOCKET] Cleaning up connection');
                newSocket.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
