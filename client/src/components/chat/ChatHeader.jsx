import { FiArrowLeft, FiUsers, FiInfo, FiSearch, FiX } from 'react-icons/fi';
import { formatLastSeen, isUserOnline } from '../../utils/timeUtils';

const ChatHeader = ({
    selectedChat,
    user,
    isMobileView,
    setShowChatList,
    setShowGroupInfo,
    showMsgSearch,
    setShowMsgSearch,
    messageSearchQuery,
    setMessageSearchQuery,
    onlineUsers
}) => {
    return (
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
                            <p className={`text-xs font-medium ${onlineUsers?.has(selectedChat.participants.find(p => p._id !== user._id)?._id) || isUserOnline(selectedChat.participants.find(p => p._id !== user._id)?.lastSeen) ? 'text-green-500' : 'text-slate-400'}`}>
                                {onlineUsers?.has(selectedChat.participants.find(p => p._id !== user._id)?._id) ?
                                    'Online' :
                                    formatLastSeen(selectedChat.participants.find(p => p._id !== user._id)?.lastSeen)
                                }
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
        </>
    );
};

export default ChatHeader;
