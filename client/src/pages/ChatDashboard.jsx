import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { chatService, userService, groupService } from '../services/api';
import { toast } from 'react-hot-toast';

// Components
import Sidebar from '../components/chat/Sidebar';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import CreateGroupModal from '../components/CreateGroupModal';
import ProfileModal from '../components/ProfileModal';
import GroupInfoModal from '../components/GroupInfoModal';

import { requestNotificationPermission, showMessageNotification } from '../utils/notifications';

const ChatDashboard = () => {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const { theme, toggleTheme } = useTheme();

    // State
    const [conversations, setConversations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState('');
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'groups'
    const [isDragging, setIsDragging] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [showMsgSearch, setShowMsgSearch] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Mobile responsive states
    const [isMobileView, setIsMobileView] = useState(false);
    const [showChatList, setShowChatList] = useState(true);

    const messagesEndRef = useRef(null);
    const fileUploadRef = useRef(null);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Detect screen size for mobile view
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobileView();
        window.addEventListener('resize', checkMobileView);

        return () => window.removeEventListener('resize', checkMobileView);
    }, []);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversations and groups on load and when socket connects
    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchGroups();
        }
    }, [user, socket]);

    // Listen for incoming messages and user status
    useEffect(() => {
        if (socket) {
            socket.on('new_message', (message) => {
                console.log('[CLIENT] Received new_message:', message._id, message.content?.substring(0, 20));

                // Show notification for messages from others (not from any of current user's devices)
                // Use robust check: compare IDs OR usernames
                const isOwnMessage = (message.sender._id && user._id && message.sender._id.toString() === user._id.toString()) ||
                    (message.sender.username && user.username && message.sender.username === user.username);

                if (!isOwnMessage) {
                    const senderName = message.sender.username;
                    const isGroup = !!message.group;

                    // Show browser notification
                    showMessageNotification(message, senderName, isGroup);

                    // Show toast notification
                    toast.success(`New message from ${senderName}`);
                }

                const msgConversationId = message.conversation?._id || message.conversation;
                const msgGroupId = message.group?._id || message.group;

                if (selectedChat && (selectedChat._id === msgConversationId || selectedChat._id === msgGroupId)) {
                    setMessages((prev) => {
                        // Prevent duplicates
                        if (prev.some(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                    // If it's the current chat, mark as read immediately
                    if (document.visibilityState === 'visible') {
                        socket.emit('mark_read', {
                            conversationId: message.conversation?._id || message.conversation,
                            messageId: message._id
                        });
                    }
                }

                // OPTIMISTIC UPDATE: Update conversations/groups list locally
                const updateList = (list, setList) => {
                    setList(prev => {
                        const index = prev.findIndex(c => c._id === (msgConversationId || msgGroupId));
                        if (index !== -1) {
                            const updatedChat = { ...prev[index] };
                            updatedChat.lastMessage = message;
                            updatedChat.updatedAt = new Date().toISOString();

                            // Only increment unread count for messages from others AND if not current chat
                            if (!isOwnMessage && (!selectedChat || (selectedChat._id !== updatedChat._id))) {
                                const currentCount = (updatedChat.unreadCount && updatedChat.unreadCount[user._id]) || 0;
                                updatedChat.unreadCount = { ...updatedChat.unreadCount, [user._id]: currentCount + 1 };
                            }

                            const newList = [...prev];
                            newList.splice(index, 1);
                            newList.unshift(updatedChat);
                            return newList;
                        }
                        // If new chat/not found, fallback to fetch (or we could add it if we had full chat data)
                        fetchConversations(); // Fallback for completely new chats
                        return prev;
                    });
                };

                if (message.group) {
                    updateList(groups, setGroups);
                } else {
                    updateList(conversations, setConversations);
                }

            });

            socket.on('typing', ({ room, user: typingUsername }) => {
                if (selectedChat && (selectedChat._id === room) && typingUsername !== user.username) {
                    setIsTyping(true);
                    setTypingUser(typingUsername);
                }
            });

            socket.on('stop_typing', ({ room }) => {
                if (selectedChat && (selectedChat._id === room)) {
                    setIsTyping(false);
                    setTypingUser('');
                }
            });

            // Listen for user status changes
            socket.on('user_status_change', ({ userId, status }) => {
                setOnlineUsers((prev) => {
                    const newSet = new Set(prev);
                    if (status === 'online') {
                        newSet.add(userId);
                    } else {
                        newSet.delete(userId);
                    }
                    return newSet;
                });
            });

            // Request current online users list
            socket.emit('get_online_users');
            socket.on('online_users_list', (userIds) => {
                setOnlineUsers(new Set(userIds));
            });

            return () => {
                socket.off('new_message');
                socket.off('typing');
                socket.off('stop_typing');
                socket.off('user_status_change');
                socket.off('online_users_list');
            };
        }
    }, [socket, selectedChat, user, groups, conversations]); // Added dependencies for local updates

    // Prevent default drag behavior globally to avoid navigation
    useEffect(() => {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Prevent browser from opening files when dragged anywhere
        window.addEventListener('dragenter', preventDefaults, false);
        window.addEventListener('dragover', preventDefaults, false);
        window.addEventListener('drop', preventDefaults, false);

        return () => {
            window.removeEventListener('dragenter', preventDefaults, false);
            window.removeEventListener('dragover', preventDefaults, false);
            window.removeEventListener('drop', preventDefaults, false);
        };
    }, []);

    const fetchConversations = async () => {
        try {
            const { data } = await chatService.fetchConversations();
            setConversations(data);
            // Join all conversation rooms to receive updates
            if (socket && data.length > 0) {
                data.forEach(chat => {
                    socket.emit('join_conversation', chat._id);
                });
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const { data } = await groupService.fetchGroups();
            setGroups(data);
            // Join all group rooms
            if (socket && data.length > 0) {
                data.forEach(group => {
                    socket.emit('join_conversation', group._id);
                });
            }
        } catch (error) {
            console.error('Failed to fetch groups', error);
        }
    };

    const handleSearch = async (e) => {
        setSearchQuery(e.target.value);
        if (e.target.value.length > 1) {
            try {
                const { data } = await userService.searchUsers(e.target.value);
                setSearchResults(data);
            } catch (error) {
                console.error('Search failed', error);
            }
        } else {
            setSearchResults([]);
        }
    };

    const startChat = async (userId) => {
        try {
            const { data } = await chatService.accessConversation(userId);
            setSelectedChat({ ...data, isGroup: false });
            setSearchResults([]);
            setSearchQuery('');
            setPage(1);
            fetchMessages(data._id, false, 1);
            socket.emit('join_conversation', data._id);
            // Add to conversations if not exists
            if (!conversations.find(c => c._id === data._id)) {
                setConversations(prev => [data, ...prev]);
            }
        } catch (error) {
            console.error('Failed to start chat', error);
        }
    };

    const fetchMessages = async (chatId, isGroup = false, pageNum = 1) => {
        setLoadingMessages(true);
        try {
            const { data } = isGroup
                ? await chatService.fetchGroupMessages(chatId, pageNum)
                : await chatService.fetchMessages(chatId, pageNum);

            if (data.length < 50) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (pageNum === 1) {
                setMessages(data);
                setTimeout(scrollToBottom, 100); // Scroll to bottom only on first load
            } else {
                setMessages(prev => [...data, ...prev]);
            }
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const loadMoreMessages = () => {
        if (!loadingMessages && hasMore) {
            fetchMessages(selectedChat._id, selectedChat.isGroup, page + 1);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        // Allow sending if there's either a message OR a file
        if (!newMessage.trim() && !selectedFile) return;

        try {
            let messageData;

            if (selectedFile) {
                // Send file
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('content', newMessage);
                if (selectedChat.isGroup) {
                    formData.append('groupId', selectedChat._id);
                } else {
                    formData.append('conversationId', selectedChat._id);
                }

                const { data } = await chatService.sendMessage(formData);
                messageData = data;
            } else {
                // Send text message
                const { data } = await chatService.sendMessage({
                    content: newMessage,
                    conversationId: selectedChat.isGroup ? undefined : selectedChat._id,
                    groupId: selectedChat.isGroup ? selectedChat._id : undefined,
                });
                messageData = data;
            }

            setNewMessage('');
            // Use functional update to ensure we're working with the latest state
            setMessages(prev => [...prev, messageData]);
            socket.emit('send_message', messageData);
            socket.emit('stop_typing', selectedChat._id);

            // Clear selected file in parent state
            setSelectedFile(null);

            // OPTIMISTIC UPDATE: Update local list immediately
            const updateLocalList = (list, setList) => {
                setList(prev => {
                    const index = prev.findIndex(c => c._id === selectedChat._id);
                    if (index !== -1) {
                        const updatedChat = { ...prev[index] };
                        updatedChat.lastMessage = messageData;
                        updatedChat.updatedAt = new Date().toISOString();
                        const newList = [...prev];
                        newList.splice(index, 1);
                        newList.unshift(updatedChat);
                        return newList;
                    }
                    return prev;
                });
            };

            if (selectedChat.isGroup) {
                updateLocalList(groups, setGroups);
            } else {
                updateLocalList(conversations, setConversations);
            }

        } catch (error) {
            console.error('Failed to send message', error);
            toast.error(error.response?.data?.message || 'Failed to send message');
        }
    };

    // Drag and drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Safety check to ensure items are files, not text
        if (e.dataTransfer.items) {
            const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
            if (!hasFiles) return;
        }

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];

            // Validate file size (50MB max)
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size must be less than 50MB');
                return;
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Invalid file type. Allowed: images, videos, PDF, Word documents');
                return;
            }

            setSelectedFile(file);
            toast.success(`File "${file.name}" ready to send`);
        }
    };

    const handleSelectChat = async (chat, isGroup = false) => {
        setSelectedChat({ ...chat, isGroup });
        setPage(1);
        fetchMessages(chat._id, isGroup, 1);
        socket.emit('join_conversation', chat._id);

        // OPTIMISTICALLY clear unread count in specific chat
        const clearUnread = (list, setList) => {
            setList(prev => prev.map(c => {
                if (c._id === chat._id) {
                    return { ...c, unreadCount: { ...c.unreadCount, [user._id]: 0 } };
                }
                return c;
            }));
        };

        if (isGroup) {
            clearUnread(groups, setGroups);
        } else {
            clearUnread(conversations, setConversations);
        }

        // Mark messages as read in backend
        try {
            if (isGroup) {
                await chatService.markGroupAsRead(chat._id);
            } else {
                await chatService.markAsRead(chat._id);
            }
            // We don't need to fetchConversations here anymore because we updated optimistically
            // But we can do it silently in background if we want strictly consistent state
            // fetchConversations(); 
        } catch (error) {
            console.error('Failed to mark as read', error);
        }

        // Hide chat list on mobile when chat is selected
        if (isMobileView) {
            setShowChatList(false);
        }
    };

    const handleGroupCreated = (group) => {
        fetchGroups();
        toast.success('Group created successfully!');
    };

    return (
        <div className="flex h-screen bg-slate-900/50 backdrop-blur-sm overflow-hidden transition-colors duration-300">
            {/* Sidebar - Conditional for mobile */}
            {(!isMobileView || showChatList) && (
                <Sidebar
                    user={user}
                    logout={logout}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchQuery={searchQuery}
                    handleSearch={handleSearch}
                    setShowProfileModal={setShowProfileModal}
                    setShowGroupModal={setShowGroupModal}
                    searchResults={searchResults}
                    startChat={startChat}
                    conversations={conversations}
                    selectedChat={selectedChat}
                    handleSelectChat={handleSelectChat}
                    groups={groups}
                    isMobileView={isMobileView}
                    onlineUsers={onlineUsers} // PASS onlineUsers to Sidebar
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm relative">
                {selectedChat ? (
                    <>
                        <ChatHeader
                            selectedChat={selectedChat}
                            user={user}
                            isMobileView={isMobileView}
                            setShowChatList={setShowChatList}
                            setShowGroupInfo={setShowGroupInfo}
                            showMsgSearch={showMsgSearch}
                            setShowMsgSearch={setShowMsgSearch}
                            messageSearchQuery={messageSearchQuery}
                            setMessageSearchQuery={setMessageSearchQuery}
                            onlineUsers={onlineUsers}
                        />

                        <MessageList
                            messages={messages}
                            user={user}
                            selectedChat={selectedChat}
                            isTyping={isTyping}
                            typingUser={typingUser}
                            messagesEndRef={messagesEndRef}
                            isDragging={isDragging}
                            handleDragEnter={handleDragEnter}
                            handleDragOver={handleDragOver}
                            handleDragLeave={handleDragLeave}
                            handleDrop={handleDrop}
                            messageSearchQuery={messageSearchQuery}
                            loadMoreMessages={loadMoreMessages}
                            hasMore={hasMore}
                            loadingMessages={loadingMessages}
                        />

                        <ChatInput
                            handleSendMessage={handleSendMessage}
                            fileUploadRef={fileUploadRef}
                            setSelectedFile={setSelectedFile}
                            selectedFile={selectedFile}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            socket={socket}
                            selectedChat={selectedChat}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <span className="text-4xl">👋</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome to QuickChat</h2>
                        <p>Select a conversation or start a new one.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateGroupModal
                isOpen={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                onGroupCreated={handleGroupCreated}
            />

            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />

            {selectedChat && selectedChat.isGroup && (
                <GroupInfoModal
                    isOpen={showGroupInfo}
                    onClose={() => setShowGroupInfo(false)}
                    chat={selectedChat}
                />
            )}
        </div>
    );
};

export default ChatDashboard;
