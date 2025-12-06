import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { chatService, userService, groupService } from '../services/api';
import { FiUsers, FiImage, FiFile, FiDownload, FiInfo, FiMoon, FiSun, FiSearch, FiLogOut, FiShield, FiX, FiArrowLeft, FiMenu } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import FileUploadButton from '../components/FileUploadButton';
import CreateGroupModal from '../components/CreateGroupModal';
import ProfileModal from '../components/ProfileModal';
import GroupInfoModal from '../components/GroupInfoModal';
import { formatLastSeen, isUserOnline } from '../utils/timeUtils';
import { requestNotificationPermission, showMessageNotification, updateTabTitle } from '../utils/notifications';

const ChatDashboard = () => {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
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

    // Mobile responsive states
    const [isMobileView, setIsMobileView] = useState(false);
    const [showChatList, setShowChatList] = useState(true);

    // Notification states
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

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

    // Fetch conversations and groups on load
    useEffect(() => {
        fetchConversations();
        fetchGroups();
    }, []);

    // Listen for incoming messages and user status
    useEffect(() => {
        if (socket) {
            socket.on('new_message', (message) => {
                // Show notification for messages from others
                if (message.sender._id !== user._id) {
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
                    setMessages((prev) => [...prev, message]);
                }
                // Refresh conversations list to update last message
                fetchConversations();
                fetchGroups();
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
    }, [socket, selectedChat, user]);

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
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const { data } = await groupService.fetchGroups();
            setGroups(data);
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
            fetchMessages(data._id, false);
            socket.emit('join_conversation', data._id);
        } catch (error) {
            console.error('Failed to start chat', error);
        }
    };

    const fetchMessages = async (chatId, isGroup = false) => {
        try {
            const { data } = isGroup
                ? await chatService.fetchGroupMessages(chatId)
                : await chatService.fetchMessages(chatId);
            setMessages(data);
        } catch (error) {
            console.error('Failed to fetch messages', error);
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
            setMessages([...messages, messageData]);
            socket.emit('send_message', messageData);
            socket.emit('stop_typing', selectedChat._id);

            // Clear selected file in parent state
            setSelectedFile(null);

            fetchConversations();
            fetchGroups();
        } catch (error) {
            console.error('Failed to send message', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
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
        fetchMessages(chat._id, isGroup);
        socket.emit('join_conversation', chat._id);

        // Mark messages as read
        try {
            if (isGroup) {
                await chatService.markGroupAsRead(chat._id);
            } else {
                await chatService.markAsRead(chat._id);
            }
            // Refresh conversations to update unread count
            fetchConversations();
            fetchGroups();
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

    const renderFilePreview = (msg) => {
        if (!msg.fileUrl) return null;

        const getFileUrl = (url) => {
            return url.startsWith('data:') ? url : `${import.meta.env.VITE_SOCKET_URL}${url}`;
        };

        if (msg.fileType === 'image') {
            return (
                <div className="mt-2">
                    <img
                        src={getFileUrl(msg.fileUrl)}
                        alt={msg.fileName}
                        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() => window.open(getFileUrl(msg.fileUrl), '_blank')}
                    />
                </div>
            );
        } else if (msg.fileType === 'video') {
            return (
                <div className="mt-2">
                    <video
                        src={getFileUrl(msg.fileUrl)}
                        controls
                        className="max-w-xs rounded-lg"
                    />
                </div>
            );
        } else {
            return (
                <a
                    href={getFileUrl(msg.fileUrl)}
                    download={msg.fileName}
                    className="flex items-center space-x-2 mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200"
                >
                    <FiFile className="w-5 h-5" />
                    <span className="text-sm">{msg.fileName}</span>
                    <FiDownload className="w-4 h-4 ml-auto" />
                </a>
            );
        }
    };

    return (
        <div className="flex h-screen bg-slate-900/50 backdrop-blur-sm overflow-hidden transition-colors duration-300">
            {/* Sidebar - Conditional for mobile */}
            {(!isMobileView || showChatList) && (
                <div className={`${isMobileView ? 'w-full' : 'w-1/4 md:w-1/3 lg:w-1/4'} bg-slate-800/80 backdrop-blur-md border-r border-slate-700/50 flex flex-col shadow-xl z-10 ${isMobileView ? 'animate-slide-in-left' : ''}`}>
                    {/* Header */}
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setShowProfileModal(true)}>
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
                                        <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden">
                                            {user?.profilePicture ? (
                                                <img
                                                    src={user.profilePicture.startsWith('data:') ? user.profilePicture : `${import.meta.env.VITE_SOCKET_URL}${user.profilePicture}`}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-primary font-bold text-xl">
                                                    {user?.username?.[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                                </div>
                                <div>
                                    <h2 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{user?.username}</h2>
                                    <p className="text-xs text-slate-400">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="p-2 rounded-full hover:bg-slate-700 text-slate-300 transition-all duration-200"
                                        title="Admin Dashboard"
                                    >
                                        <FiShield className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={logout}
                                    className="p-2 rounded-full hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all duration-200"
                                    title="Logout"
                                >
                                    <FiLogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-1 bg-slate-700/50 rounded-xl mb-4">
                            <button
                                onClick={() => setActiveTab('chats')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'chats'
                                    ? 'bg-slate-600 text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Chats v1.2
                            </button>
                            <button
                                onClick={() => setActiveTab('groups')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'groups'
                                    ? 'bg-slate-600 text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Groups
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Create Group Button */}
                    {activeTab === 'groups' && (
                        <div className="px-4 py-3">
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]"
                            >
                                <FiUsers className="w-5 h-5" />
                                <span>Create New Group</span>
                            </button>
                        </div>
                    )
                    }

                    {/* Search Results or Conversations/Groups List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {searchResults.length > 0 ? (
                            <>
                                <h3 className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Search Results</h3>
                                {searchResults.map((result) => (
                                    <div
                                        key={result._id}
                                        onClick={() => startChat(result._id)}
                                        className="mx-2 px-3 py-3 rounded-xl hover:bg-slate-700/50 cursor-pointer flex items-center space-x-3 transition-all duration-200"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-accent p-[2px]">
                                            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                                {result.profilePicture ? (
                                                    <img src={result.profilePicture.startsWith('data:') ? result.profilePicture : `${import.meta.env.VITE_SOCKET_URL}${result.profilePicture}`} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-secondary font-bold">{result.username[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-200">{result.username}</h4>
                                            <p className="text-xs text-slate-400 truncate max-w-[150px]">{result.bio || 'Available'}</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {activeTab === 'chats' ? (
                                    conversations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <FiInfo className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <p className="text-sm">No conversations yet.<br />Search for users to start chatting!</p>
                                        </div>
                                    ) : (
                                        conversations.map((chat) => (
                                            <div
                                                key={chat._id}
                                                onClick={() => handleSelectChat(chat)}
                                                className={`mx-2 px-3 py-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-all duration-200 border-b border-transparent ${selectedChat?._id === chat._id
                                                    ? 'bg-primary/20 border-primary/10'
                                                    : 'hover:bg-slate-700/50'
                                                    }`}
                                            >
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 p-[2px]">
                                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                                            {chat.participants.find(p => p._id !== user._id)?.profilePicture ? (
                                                                <img
                                                                    src={chat.participants.find(p => p._id !== user._id).profilePicture.startsWith('data:')
                                                                        ? chat.participants.find(p => p._id !== user._id).profilePicture
                                                                        : `${import.meta.env.VITE_SOCKET_URL}${chat.participants.find(p => p._id !== user._id).profilePicture}`
                                                                    }
                                                                    alt="Profile"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-indigo-500 font-bold text-lg">
                                                                    {chat.participants.find(p => p._id !== user._id)?.username[0].toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Online status indicator - only show if truly online (within 1 min) */}
                                                    {isUserOnline(chat.participants.find(p => p._id !== user._id)?.lastSeen) && (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <h4 className={`font-semibold truncate ${selectedChat?._id === chat._id ? 'text-primary-light' : 'text-slate-200'}`}>
                                                            {chat.participants.find(p => p._id !== user._id)?.username}
                                                        </h4>
                                                        <div className="flex items-center space-x-2">
                                                            {chat.lastMessage && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                            {/* Unread count badge - WhatsApp style */}
                                                            {chat.unreadCount && (chat.unreadCount[user._id] || (chat.unreadCount.get && chat.unreadCount.get(user._id))) > 0 && (
                                                                <div className="min-w-[20px] h-5 bg-green-500 rounded-full flex items-center justify-center px-1.5">
                                                                    <span className="text-[10px] font-bold text-white">
                                                                        {chat.unreadCount[user._id] || chat.unreadCount.get(user._id)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Show last seen instead of message preview if no messages */}
                                                    {chat.lastMessage ? (
                                                        <p className={`text-xs truncate ${selectedChat?._id === chat._id ? 'text-primary-light/70' : 'text-slate-400'}`}>
                                                            {chat.lastMessage.fileUrl ? (
                                                                <span className="flex items-center"><FiFile className="mr-1" /> File</span>
                                                            ) : (
                                                                chat.lastMessage.content
                                                            )}
                                                        </p>
                                                    ) : (
                                                        <p className={`text-xs ${selectedChat?._id === chat._id ? 'text-primary-light/70' : 'text-slate-400'}`}>
                                                            {formatLastSeen(chat.participants.find(p => p._id !== user._id)?.lastSeen)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    groups.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <FiUsers className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <p className="text-sm">No groups yet.<br />Create one to get started!</p>
                                        </div>
                                    ) : (
                                        groups.map((group) => (
                                            <div
                                                key={group._id}
                                                onClick={() => handleSelectChat(group, true)}
                                                className={`mx-2 px-3 py-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-all duration-200 border-b border-transparent ${selectedChat?._id === group._id
                                                    ? 'bg-primary/20 border-primary/10'
                                                    : 'hover:bg-slate-700/50'
                                                    }`}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 p-[2px]">
                                                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        <FiUsers className="w-6 h-6 text-pink-500" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <h4 className={`font-semibold truncate ${selectedChat?._id === group._id ? 'text-primary-light' : 'text-slate-200'}`}>
                                                            {group.name}
                                                        </h4>
                                                        <div className="flex items-center space-x-2">
                                                            {group.lastMessage && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(group.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                            {/* Unread count badge - WhatsApp style */}
                                                            {group.unreadCount && (group.unreadCount[user._id] || (group.unreadCount.get && group.unreadCount.get(user._id))) > 0 && (
                                                                <div className="min-w-[20px] h-5 bg-green-500 rounded-full flex items-center justify-center px-1.5">
                                                                    <span className="text-[10px] font-bold text-white">
                                                                        {group.unreadCount[user._id] || group.unreadCount.get(user._id)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`text-xs truncate ${selectedChat?._id === group._id ? 'text-primary-light/70' : 'text-slate-400'}`}>
                                                        {group.lastMessage ? (
                                                            <span>
                                                                <span className="font-medium text-slate-300">{group.lastMessage.sender.username}: </span>
                                                                {group.lastMessage.fileUrl ? 'Sent a file' : group.lastMessage.content}
                                                            </span>
                                                        ) : (
                                                            <span className="italic">No messages yet</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div >
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm relative">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center space-x-4">
                                {/* Back button for mobile */}
                                {isMobileView && (
                                    <button
                                        onClick={() => setShowChatList(true)}
                                        className="p-2 rounded-full hover:bg-slate-700 text-slate-300 transition-all duration-200 active:scale-95"
                                        title="Back to chats"
                                    >
                                        <FiArrowLeft className="w-5 h-5" />
                                    </button>
                                )}

                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                        {selectedChat.isGroup ? (
                                            <FiUsers className="w-5 h-5 text-primary" />
                                        ) : (
                                            selectedChat.participants.find(p => p._id !== user._id)?.profilePicture ? (
                                                <img
                                                    src={selectedChat.participants.find(p => p._id !== user._id).profilePicture.startsWith('data:')
                                                        ? selectedChat.participants.find(p => p._id !== user._id).profilePicture
                                                        : `${import.meta.env.VITE_SOCKET_URL}${selectedChat.participants.find(p => p._id !== user._id).profilePicture}`
                                                    }
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-primary font-bold">{selectedChat.participants.find(p => p._id !== user._id)?.username[0].toUpperCase()}</span>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">
                                        {selectedChat.isGroup
                                            ? selectedChat.name
                                            : selectedChat.participants.find(p => p._id !== user._id)?.username}
                                    </h3>
                                    {selectedChat.isGroup ? (
                                        <p className="text-xs text-slate-400">{selectedChat.members.length} members</p>
                                    ) : (
                                        <p className={`text-xs font-medium ${isUserOnline(selectedChat.participants.find(p => p._id !== user._id)?.lastSeen) ? 'text-green-500' : 'text-slate-400'}`}>
                                            {formatLastSeen(selectedChat.participants.find(p => p._id !== user._id)?.lastSeen)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {selectedChat.isGroup && (
                                    <button
                                        onClick={() => setShowGroupInfo(true)}
                                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400 transition-colors"
                                        title="Group Info"
                                    >
                                        <FiInfo className="w-6 h-6" />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowMsgSearch(!showMsgSearch);
                                        if (showMsgSearch) setMessageSearchQuery('');
                                    }}
                                    className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${showMsgSearch ? 'text-primary bg-slate-700' : 'text-slate-400'}`}
                                    title="Search Messages"
                                >
                                    <FiSearch className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Message Search Bar */}
                        {showMsgSearch && (
                            <div className="px-6 py-2 bg-slate-800 border-b border-slate-700 animate-fade-in-down">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search in conversation..."
                                        value={messageSearchQuery}
                                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        autoFocus
                                    />
                                    {messageSearchQuery && (
                                        <button
                                            onClick={() => setMessageSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                        >
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div
                            className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar ${isDragging ? 'bg-primary/10 border-2 border-dashed border-primary m-4 rounded-2xl transition-all' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {isDragging && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-50 backdrop-blur-sm rounded-2xl">
                                    <div className="text-center p-8 rounded-3xl bg-slate-800 shadow-2xl border border-slate-700 transform scale-110 transition-transform">
                                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiDownload className="w-10 h-10 text-primary animate-bounce" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Drop files here</h3>
                                        <p className="text-slate-400">Send images, videos, or documents</p>
                                    </div>
                                </div>
                            )}

                            {messages
                                .filter(msg => {
                                    if (!messageSearchQuery) return true;
                                    return msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase());
                                })
                                .map((msg, index) => {
                                    const isOwn = msg.sender._id === user._id;
                                    const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender._id !== msg.sender._id);

                                    return (
                                        <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-fade-in-up`}>
                                            {!isOwn && (
                                                <div className={`w-8 h-8 rounded-full mr-2 flex-shrink-0 bg-gradient-to-br from-secondary to-accent p-[1px] ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        {msg.sender.profilePicture ? (
                                                            <img
                                                                src={msg.sender.profilePicture.startsWith('data:')
                                                                    ? msg.sender.profilePicture
                                                                    : `${import.meta.env.VITE_SOCKET_URL}${msg.sender.profilePicture}`
                                                                }
                                                                alt="Avatar"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-secondary">{msg.sender.username[0].toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                                {selectedChat.isGroup && !isOwn && showAvatar && (
                                                    <span className="text-xs text-slate-400 ml-1 mb-1">{msg.sender.username}</span>
                                                )}
                                                <div
                                                    className={`p-3 rounded-2xl shadow-sm ${isOwn
                                                        ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-tr-none'
                                                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                                                        }`}
                                                >
                                                    {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                                                    {renderFilePreview(msg)}
                                                </div>
                                                <span className={`text-[10px] mt-1 px-1 ${isOwn ? 'text-slate-400' : 'text-slate-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            <div ref={messagesEndRef} />

                            {isTyping && (
                                <div className="flex items-center space-x-2 text-slate-400 text-sm ml-12 animate-pulse">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span>{typingUser} is typing...</span>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 z-10">
                            <form onSubmit={handleSendMessage} className="flex items-end space-x-3 max-w-4xl mx-auto">
                                <div className="flex-shrink-0 mb-1">
                                    <FileUploadButton
                                        ref={fileUploadRef}
                                        onFileSelect={setSelectedFile}
                                        file={selectedFile}
                                    />
                                </div>
                                <div className="flex-1 bg-slate-700/50 rounded-2xl border border-transparent focus-within:border-primary/50 focus-within:bg-slate-800 transition-all duration-200">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            socket.emit('typing', selectedChat._id);

                                            // Auto-stop typing after delay
                                            const timeoutId = setTimeout(() => {
                                                socket.emit('stop_typing', selectedChat._id);
                                            }, 2000);
                                            return () => clearTimeout(timeoutId);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        className="w-full px-4 py-3 bg-transparent border-none focus:ring-0 text-white placeholder-slate-400 resize-none max-h-32 min-h-[48px]"
                                        rows="1"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() && !selectedFile}
                                    className="mb-1 p-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-8 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                                    <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">Welcome to Chat App</h2>
                        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                            Select a conversation from the sidebar or start a new one to begin messaging. Experience real-time chat with a premium feel.
                        </p>
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

            <GroupInfoModal
                isOpen={showGroupInfo}
                onClose={() => setShowGroupInfo(false)}
                group={selectedChat}
                onGroupUpdated={(updatedGroup) => {
                    fetchGroups();
                    if (updatedGroup) {
                        setSelectedChat({ ...updatedGroup, isGroup: true });
                    }
                    if (selectedChat?.isGroup) {
                        fetchMessages(selectedChat._id, true);
                    }
                }}
            />
        </div >
    );
};

export default ChatDashboard;
