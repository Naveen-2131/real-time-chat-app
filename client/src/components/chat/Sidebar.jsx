import { FiUsers, FiSearch, FiLogOut, FiShield, FiInfo, FiFile } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { formatLastSeen, isUserOnline } from '../../utils/timeUtils';

const Sidebar = ({
    user,
    logout,
    activeTab,
    setActiveTab,
    searchQuery,
    handleSearch,
    setShowProfileModal,
    setShowGroupModal,
    searchResults,
    startChat,
    conversations,
    selectedChat,
    handleSelectChat,
    groups,
    isMobileView,
    navigate,
    onlineUsers // New prop
}) => {
    return (
        <div className={`${isMobileView ? 'w-full' : 'w-1/4 md:w-1/3 lg:w-1/4'} bg-slate-800/80 backdrop-blur-md border-r border-slate-700/50 flex flex-col shadow-xl z-10 ${isMobileView ? 'animate-slide-in-left' : ''}`}>
            {/* ... (Header section unchanged) ... */}
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
                    {/* ... (Buttons unchanged) ... */}
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
                        Chats
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
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-accent p-[2px]">
                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                            {result.profilePicture ? (
                                                <img src={result.profilePicture.startsWith('data:') ? result.profilePicture : `${import.meta.env.VITE_SOCKET_URL}${result.profilePicture}`} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-secondary font-bold">{result.username[0].toUpperCase()}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Handle online status for search results too if desired, generally not shown here but possible */}
                                    {onlineUsers && onlineUsers.has(result._id) && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                                    )}
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
                                            {/* Online status indicator - TRUST onlineUsers prop first */}
                                            {(onlineUsers?.has(chat.participants.find(p => p._id !== user._id)?._id) || isUserOnline(chat.participants.find(p => p._id !== user._id)?.lastSeen)) && (
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
                                                    {/* Check onlineUsers prop first */}
                                                    {onlineUsers?.has(chat.participants.find(p => p._id !== user._id)?._id) ?
                                                        <span className="text-green-400 font-medium">Online</span> :
                                                        formatLastSeen(chat.participants.find(p => p._id !== user._id)?.lastSeen)
                                                    }
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
    );
};

export default Sidebar;
