import { useRef, useState, useEffect } from 'react';
import { FiDownload, FiFile, FiMoreVertical, FiFlag, FiLoader } from 'react-icons/fi';
import ReportModal from '../ReportModal';

const MessageList = ({
    messages,
    user,
    selectedChat,
    isTyping,
    typingUser,
    messagesEndRef,
    isDragging,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    messageSearchQuery,
    loadMoreMessages,
    hasMore,
    loadingMessages
}) => {
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [messageToReport, setMessageToReport] = useState(null);
    const [activeMessageId, setActiveMessageId] = useState(null);

    const scrollRef = useRef(null);
    const prevScrollHeightRef = useRef(0);

    // Maintain scroll position when previous messages are loaded
    useEffect(() => {
        if (scrollRef.current) {
            const currentScrollHeight = scrollRef.current.scrollHeight;
            if (prevScrollHeightRef.current > 0 && currentScrollHeight > prevScrollHeightRef.current) {
                // Determine if we were near the top (loading more) or handled a new message
                // If messages length increased significantly, we likely loaded more
                // This logic handles keeping the view stable when prepending items
                const heightDifference = currentScrollHeight - prevScrollHeightRef.current;
                scrollRef.current.scrollTop = heightDifference;
            }
            prevScrollHeightRef.current = currentScrollHeight;
        }
    }, [messages]);

    const handleScroll = (e) => {
        const { scrollTop } = e.target;
        if (scrollTop === 0 && hasMore && !loadingMessages) {
            // Save current scroll height before loading more
            if (scrollRef.current) {
                prevScrollHeightRef.current = scrollRef.current.scrollHeight;
            }
            loadMoreMessages();
        }
    };

    const handleReportClick = (msg) => {
        setMessageToReport(msg);
        setReportModalOpen(true);
        setActiveMessageId(null);
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
        <div
            ref={scrollRef}
            onScroll={handleScroll}
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

            {/* Loading Indicator for Infinite Scroll */}
            {loadingMessages && (
                <div className="flex justify-center p-2">
                    <FiLoader className="w-6 h-6 text-primary animate-spin" />
                </div>
            )}

            {messages
                .filter(msg => {
                    if (!messageSearchQuery) return true;
                    return msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase());
                })
                .map((msg, index) => {
                    const senderId = msg.sender._id || msg.sender;
                    // Robust check: Compare as strings OR compare usernames (fallback)
                    const isOwn = (senderId && user._id && senderId.toString() === user._id.toString()) ||
                        (user.username && msg.sender.username && user.username === msg.sender.username);

                    // Debug logging
                    if (msg.content && msg.content.includes('vjbk')) {
                        console.log('[ALIGNMENT DEBUG]', {
                            messageContent: msg.content,
                            senderId: senderId?.toString(),
                            userId: user._id?.toString(),
                            senderUsername: msg.sender.username,
                            userUsername: user.username,
                            isOwn
                        });
                    }

                    // Avatar logic: Show if NOT own AND (first message OR previous message was from different sender)
                    const prevSenderId = index > 0 ? (messages[index - 1].sender._id || messages[index - 1].sender) : null;
                    const showAvatar = !isOwn && (index === 0 || (prevSenderId && prevSenderId.toString() !== senderId.toString()));

                    return (
                        <div
                            key={msg._id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-fade-in-up relative`}
                            onMouseLeave={() => setActiveMessageId(null)}
                        >
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

                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative group`}>
                                {selectedChat.isGroup && !isOwn && showAvatar && (
                                    <span className="text-xs text-slate-400 ml-1 mb-1">{msg.sender.username}</span>
                                )}
                                <div
                                    className={`p-3 rounded-2xl shadow-sm relative ${isOwn
                                        ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                                        }`}
                                >
                                    {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                                    {renderFilePreview(msg)}

                                    {/* Action Menu Trigger (3 dots) */}
                                    {!isOwn && (
                                        <button
                                            onClick={() => setActiveMessageId(activeMessageId === msg._id ? null : msg._id)}
                                            className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/50 hover:bg-slate-900 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiMoreVertical className="w-3 h-3" />
                                        </button>
                                    )}

                                    {/* Dropdown Menu */}
                                    {activeMessageId === msg._id && !isOwn && (
                                        <div className="absolute top-8 right-0 bg-slate-800 shadow-xl border border-slate-700 rounded-lg z-50 py-1 w-32">
                                            <button
                                                onClick={() => handleReportClick(msg)}
                                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center"
                                            >
                                                <FiFlag className="mr-2 w-4 h-4" />
                                                Report
                                            </button>
                                        </div>
                                    )}
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

            {/* Report Modal */}
            <ReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                messageId={messageToReport?._id}
                reportedUser={messageToReport?.sender?.username}
            />
        </div>
    );
};

export default MessageList;
