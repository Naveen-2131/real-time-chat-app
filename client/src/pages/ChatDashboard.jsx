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

import { requestNotificationPermission, showMessageNotification, initAudioContext } from '../utils/notifications';

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
    const [messageFilters, setMessageFilters] = useState({
        type: 'all', // all, image, video, file
        date: 'all' // all, today, week, month
    });
    const [lastSync, setLastSync] = useState(Date.now()); // Force re-render for room joins if needed
    const [isLoadingData, setIsLoadingData] = useState(true); // Initial load state
    const [uploadProgress, setUploadProgress] = useState({}); // Track progress by temp ID

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Mobile responsive states
    const [isMobileView, setIsMobileView] = useState(false);
    const [showChatList, setShowChatList] = useState(true);

    const messagesEndRef = useRef(null);
    const fileUploadRef = useRef(null);

    // Request notification permission and init audio on mount
    useEffect(() => {
        requestNotificationPermission();
        initAudioContext();
    }, []);

    const handleUserGesture = () => {
        initAudioContext();
        requestNotificationPermission();
    };

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

    // Fetch all initial data in parallel
    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user, socket]);

    const fetchInitialData = async () => {
        setIsLoadingData(true);
        try {
            const [convRes, groupRes] = await Promise.all([
                chatService.fetchConversations(),
                groupService.fetchGroups()
            ]);

            setConversations(convRes.data);
            setGroups(groupRes.data);

            // Join all rooms in bulk via socket
            if (socket) {
                convRes.data.forEach(chat => socket.emit('join_conversation', chat._id));
                groupRes.data.forEach(group => socket.emit('join_conversation', group._id));
            }
        } catch (error) {
            console.error('Failed to fetch initial data', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    // Message deduplication
    const processedMessageIds = useRef(new Set());
    const conversationsRef = useRef([]);
    const groupsRef = useRef([]);

    // Listen for incoming messages and user status
    // Use refs to access latest state inside socket listeners without re-binding
    const selectedChatRef = useRef(selectedChat);

    // Sync ref with state
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    // Socket Event Listeners
    useEffect(() => {
        if (socket && user) {
            const handleReconnection = () => {
                console.log('[SOCKET] Reconnecting/Joining rooms...');
                if (user && user._id) {
                    socket.emit('join_with_data', { userId: user._id, username: user.username });
                }

                // Re-join all rooms using Ref to avoid stale closure
                const chatCount = conversationsRef.current.length;
                const groupCount = groupsRef.current.length;
                console.log(`[SOCKET] Joining ${chatCount} chats and ${groupCount} groups`);

                conversationsRef.current.forEach(chat => socket.emit('join_conversation', chat._id));
                groupsRef.current.forEach(group => socket.emit('join_conversation', group._id));

                // Re-join current chat and sync if needed
                if (selectedChatRef.current) {
                    socket.emit('join_conversation', selectedChatRef.current._id);
                }
            };

            // CRITICAL FIX: If socket is ALREADY connected when this component mounts,
            // we must run the join logic immediately, otherwise we miss the 'connect' event.
            if (socket.connected) {
                handleReconnection();
            }

            // Sync messages on reconnect if chat is open to avoid gaps
            const syncMessages = async () => {
                if (selectedChatRef.current && user) {
                    console.log('[SOCKET] Syncing messages for active chat...');
                    try {
                        const chatId = selectedChatRef.current._id;
                        const isGroup = selectedChatRef.current.isGroup;
                        // Fetch latest 50 messages
                        const { data } = isGroup
                            ? await chatService.fetchGroupMessages(chatId, 1)
                            : await chatService.fetchMessages(chatId, 1);

                        setMessages(prev => {
                            // Merge and deduplicate
                            const newMessages = [...prev];
                            data.forEach(msg => {
                                if (!newMessages.some(m => m._id === msg._id)) {
                                    newMessages.push(msg);
                                }
                            });
                            // Sort by date just in case
                            return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        });
                    } catch (err) {
                        console.error('[SOCKET] Sync failed', err);
                    }
                }
            };

            socket.on('connect', () => {
                console.log('[SOCKET] Connected:', socket.id);
                handleReconnection();
                syncMessages();
            });

            socket.on('disconnect', () => {
                console.log('[SOCKET] Disconnected');
                // toast.error('Socket Disconnected'); // Debug
            });

            socket.on('reconnect', syncMessages);

            if (socket.connected) {
                handleReconnection();
            }

            socket.on('message_read', ({ conversationId, messageId, userId }) => {
                // Update message status locally if we tracked it
                console.log(`[SOCKET] Message ${messageId} read by ${userId}`);
            });

            socket.on('new_message', (message) => {
                const sender = message.sender?.username || 'Unknown';
                console.log(`[SOCKET DEBUG] Raw Message received from ${sender}:`, message);
                // toast('DEBUG: Received Socket Message', { icon: '🐛' });

                console.log('[SOCKET] Received new_message:', message._id, 'from:', message.sender?.username);

                // Deduplication
                if (processedMessageIds.current.has(message._id)) return;
                processedMessageIds.current.add(message._id);
                setTimeout(() => processedMessageIds.current.delete(message._id), 5000);

                const isOwnMessage = (message.sender._id && user._id && message.sender._id.toString() === user._id.toString()) ||
                    (message.sender.username && user.username && message.sender.username === user.username);

                if (!isOwnMessage) {
                    // Browser notification
                    showMessageNotification(message, message.sender.username, !!message.group);

                    // In-app Toast fallback
                    const senderName = message.sender.username || 'Someone';
                    const groupInfo = message.group ? ` in ${message.group.name || 'group'}` : '';
                    toast.success(`New message from ${senderName}${groupInfo}`, {
                        duration: 3000,
                        position: 'top-right'
                    });
                }

                const msgConversationId = message.conversation?._id || message.conversation || message.conversationId;
                const msgGroupId = message.group?._id || message.group || message.groupId;
                const currentChat = selectedChatRef.current; // access via ref to be safe

                // Normalize IDs for comparison
                const currentIdStr = currentChat?._id ? String(currentChat._id) : null;
                const msgIdStr = msgConversationId ? String(msgConversationId) : null;
                const groupIdStr = msgGroupId ? String(msgGroupId) : null;

                const isMatch = currentIdStr && (currentIdStr === msgIdStr || currentIdStr === groupIdStr);

                // Update active chat messages
                if (isMatch) {
                    setMessages((prev) => {
                        // Double check state for safety
                        if (prev.some(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });

                    if (document.visibilityState === 'visible') {
                        socket.emit('mark_read', {
                            conversationId: msgConversationId,
                            messageId: message._id
                        });
                    }
                }

                // OPTIMISTIC UPDATE: Update conversations/groups list locally
                const updateList = (list, setList) => {
                    setList(prev => {
                        const targetId = msgConversationId || msgGroupId;
                        const index = prev.findIndex(c => String(c._id) === String(targetId));

                        if (index !== -1) {
                            const updatedChat = { ...prev[index] };
                            updatedChat.lastMessage = message;
                            updatedChat.updatedAt = message.createdAt || new Date().toISOString();

                            // Increment unread count if it's NOT the current open chat AND not our own message
                            if (!isOwnMessage) {
                                if (!currentIdStr || currentIdStr !== String(targetId)) {
                                    const currentCount = (updatedChat.unreadCount && updatedChat.unreadCount[user._id]) || 0;
                                    updatedChat.unreadCount = { ...updatedChat.unreadCount, [user._id]: currentCount + 1 };
                                }
                            }

                            // Create new list, remove old item, and put updated item at the TOP
                            const newList = prev.filter(c => String(c._id) !== String(targetId));
                            return [updatedChat, ...newList];
                        } else {
                            // If it's a completely new conversation/group that we don't have in state yet
                            fetchConversations();
                            fetchGroups();
                            return prev;
                        }
                    });
                };

                if (message.group) {
                    updateList(groups, setGroups);
                } else {
                    updateList(conversations, setConversations);
                }

            });

            socket.on('typing', ({ room, user: typingUsername }) => {
                if (selectedChatRef.current && selectedChatRef.current._id === room && typingUsername !== user.username) {
                    setIsTyping(true);
                    setTypingUser(typingUsername);
                }
            });

            socket.on('stop_typing', ({ room }) => {
                if (selectedChatRef.current && selectedChatRef.current._id === room) {
                    setIsTyping(false);
                    setTypingUser('');
                }
            });

            socket.on('user_status_change', ({ userId, status }) => {
                setOnlineUsers((prev) => {
                    const newSet = new Set(prev);
                    status === 'online' ? newSet.add(userId) : newSet.delete(userId);
                    return newSet;
                });
            });

            socket.emit('get_online_users');
            socket.on('online_users_list', (userIds) => setOnlineUsers(new Set(userIds)));

            return () => {
                socket.off('connect', handleReconnection);
                socket.off('reconnect', handleReconnection);
                socket.off('new_message');
                socket.off('typing');
                socket.off('stop_typing');
                socket.off('user_status_change');
                socket.off('online_users_list');
            };
        }
    }, [socket, user]); // Stable dependencies only

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
            if (socket && data.length > 0) {
                data.forEach(chat => socket.emit('join_conversation', chat._id));
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const { data } = await groupService.fetchGroups();
            setGroups(data);
            if (socket && data.length > 0) {
                data.forEach(group => socket.emit('join_conversation', group._id));
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

        const tempId = `temp-${Date.now()}`;
        let pendingMessage = null;

        try {
            let messageData;

            if (selectedFile) {
                // Determine file type category
                let fType = 'file';
                if (selectedFile.type.startsWith('image/')) fType = 'image';
                else if (selectedFile.type.startsWith('video/')) fType = 'video';
                else if (selectedFile.type === 'application/pdf') fType = 'pdf';

                // Create pending message for optimism
                pendingMessage = {
                    _id: tempId,
                    content: newMessage,
                    sender: {
                        _id: user._id,
                        username: user.username,
                        profilePicture: user.profilePicture
                    },
                    fileUrl: URL.createObjectURL(selectedFile), // Local blob for preview
                    fileName: selectedFile.name,
                    fileType: fType,
                    status: 'uploading',
                    isGroup: selectedChat.isGroup,
                    conversation: !selectedChat.isGroup ? selectedChat._id : undefined,
                    group: selectedChat.isGroup ? selectedChat._id : undefined,
                    createdAt: new Date().toISOString()
                };

                setMessages(prev => [...prev, pendingMessage]);
                setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

                // Send file
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('content', newMessage);
                if (selectedChat.isGroup) {
                    formData.append('groupId', selectedChat._id);
                } else {
                    formData.append('conversationId', selectedChat._id);
                }

                const { data } = await chatService.sendMessage(formData, (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(prev => ({ ...prev, [tempId]: percentCompleted }));
                });
                messageData = data;

                // Revoke the local blob URL
                URL.revokeObjectURL(pendingMessage.fileUrl);
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

            if (pendingMessage) {
                // Replace pending with actual
                setMessages(prev => prev.map(m => m._id === tempId ? messageData : m));
                setUploadProgress(prev => {
                    const newProgress = { ...prev };
                    delete newProgress[tempId];
                    return newProgress;
                });
            } else {
                setMessages(prev => [...prev, messageData]);
            }

            socket.emit('send_message', messageData);
            socket.emit('stop_typing', selectedChat._id);
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
            if (pendingMessage) {
                setMessages(prev => prev.filter(m => m._id !== tempId));
                setUploadProgress(prev => {
                    const newProgress = { ...prev };
                    delete newProgress[tempId];
                    return newProgress;
                });
            }
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
    };

    const handleTestNotification = async () => {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
            showMessageNotification({ _id: 'test', content: 'Test notifications are working!' }, 'System', false);
            toast.success('Test notification sent!');
        } else {
            toast.error(`Permission is ${permission}. Check browser settings.`);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900 overflow-hidden flex"
            onClick={handleUserGesture}
        >
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
                    isLoading={isLoadingData}
                />
            )}

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-slate-900 relative ${isMobileView && showChatList ? 'hidden' : 'flex'}`}>
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
                            messageFilters={messageFilters}
                            setMessageFilters={setMessageFilters}
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
                            messageFilters={messageFilters}
                            uploadProgress={uploadProgress} // PASS uploadProgress to MessageList
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
                        <p className="mb-4">Select a conversation or start a new one.</p>
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
                    group={selectedChat}
                    onGroupUpdated={(updatedGroup) => {
                        fetchGroups();
                        setSelectedChat({ ...updatedGroup, isGroup: true });
                    }}
                />
            )}
        </div>
    );
};

export default ChatDashboard;
