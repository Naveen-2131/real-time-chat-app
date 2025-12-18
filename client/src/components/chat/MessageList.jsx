import { useRef, useState, useEffect } from 'react';
import { FiDownload, FiFile, FiMoreVertical, FiFlag, FiLoader, FiSave } from 'react-icons/fi';
import ReportModal from '../ReportModal';
import FileViewerModal from '../FileViewerModal';

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
    loadingMessages,
    messageFilters,
    uploadProgress // New prop
}) => {
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [messageToReport, setMessageToReport] = useState(null);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [fileViewerOpen, setFileViewerOpen] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);

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

    const handleFileClick = (url, name, type) => {
        setCurrentFile({ url, name, type });
        setFileViewerOpen(true);
        setActiveMessageId(null);
    };

    const handleSaveClick = async (msg) => {
        try {
            const url = getFileUrl(msg.fileUrl);

            // For data URLs, download directly
            if (url.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = url;
                link.download = msg.fileName || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setActiveMessageId(null);
                return;
            }

            // For regular URLs, fetch and create blob
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = msg.fileName || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up blob URL
            window.URL.revokeObjectURL(blobUrl);
            setActiveMessageId(null);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: try direct download
            const url = getFileUrl(msg.fileUrl);
            const link = document.createElement('a');
            link.href = url;
            link.download = msg.fileName || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setActiveMessageId(null);
        }
    };

    const getFileUrl = (url) => {
        // If it's a data URL (base64), return as-is
        if (url.startsWith('data:')) return url;
        // If it's already a full URL, return as-is
        if (url.startsWith('http')) return url;
        // Otherwise, construct the full URL using the API base URL
        const apiUrl = import.meta.env.VITE_API_URL.replace('/api', '');
        return `${apiUrl}${url}`;
    };

    const renderFilePreview = (msg) => {
        if (!msg.fileUrl) return null;

        if (msg.fileType === 'image') {
            return (
                <div className="mt-2 text-center relative group/img">
                    <img
                        src={getFileUrl(msg.fileUrl)}
                        alt={msg.fileName}
                        className={`max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${msg.status === 'uploading' ? 'opacity-50 blur-[2px]' : ''}`}
                        onClick={() => msg.status !== 'uploading' && handleFileClick(getFileUrl(msg.fileUrl), msg.fileName, 'image')}
                        onError={(e) => {
                            e.target.style.display = 'none'; // Hide broken image
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
                            e.target.className = "max-w-xs rounded-lg opacity-70";
                            e.target.onclick = null;
                        }}
                    />
                    {msg.status === 'uploading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-12 h-12">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * (uploadProgress[msg._id] || 0)) / 100} className="text-primary transition-all duration-300" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                    {uploadProgress[msg._id] || 0}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            );
        } else if (msg.fileType === 'video') {
            return (
                <div className="mt-2 relative">
                    <video
                        src={getFileUrl(msg.fileUrl)}
                        className={`max-w-xs rounded-lg cursor-pointer ${msg.status === 'uploading' ? 'opacity-50' : ''}`}
                        onClick={() => msg.status !== 'uploading' && handleFileClick(getFileUrl(msg.fileUrl), msg.fileName, 'video')}
                    />
                    {msg.status === 'uploading' ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-slate-900/60 rounded-full p-4 flex flex-col items-center">
                                <FiLoader className="w-6 h-6 text-primary animate-spin mb-1" />
                                <span className="text-[10px] font-bold text-white">{uploadProgress[msg._id] || 0}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 mt-1">Click to view in fullscreen</div>
                    )}
                </div>
            );
        } else {
            // Check if it's a PDF
            const isPDF = msg.fileName?.toLowerCase().endsWith('.pdf') || msg.fileType === 'pdf';

            if (isPDF) {
                return (
                    <div className="mt-2 w-full">
                        <div
                            onClick={() => msg.status !== 'uploading' && handleFileClick(getFileUrl(msg.fileUrl), msg.fileName, 'pdf')}
                            className={`flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group ${msg.status !== 'uploading' ? 'hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer' : 'opacity-70'}`}
                        >
                            <FiFile className="w-5 h-5 text-red-500" />
                            <div className="flex-1 min-w-0">
                                <span className="text-sm block truncate text-slate-800 dark:text-slate-200">{msg.fileName}</span>
                                {msg.status === 'uploading' && (
                                    <div className="w-full bg-slate-200 dark:bg-slate-600 h-1 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all duration-300"
                                            style={{ width: `${uploadProgress[msg._id] || 0}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            {msg.status === 'uploading' ? (
                                <span className="text-[10px] font-mono text-primary font-bold">{uploadProgress[msg._id] || 0}%</span>
                            ) : (
                                <span className="text-xs text-slate-400 ml-auto group-hover:block hidden transition-all">View</span>
                            )}
                        </div>
                    </div>
                );
            }

            // For other file types, show download link
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

    const filteredMessages = messages.filter(msg => {
        // Keyword filter
        const matchesKeyword = !messageSearchQuery ||
            msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
            msg.fileName?.toLowerCase().includes(messageSearchQuery.toLowerCase());

        // Type filter
        let matchesType = true;
        if (messageFilters.type !== 'all') {
            if (messageFilters.type === 'file') {
                matchesType = msg.fileUrl && !['image', 'video'].includes(msg.fileType);
            } else {
                matchesType = msg.fileType === messageFilters.type;
            }
        }

        // Date filter
        let matchesDate = true;
        if (messageFilters.date !== 'all') {
            const msgDate = new Date(msg.createdAt);
            const now = new Date();
            if (messageFilters.date === 'today') {
                matchesDate = msgDate.toDateString() === now.toDateString();
            } else if (messageFilters.date === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                matchesDate = msgDate >= weekAgo;
            }
        }

        return matchesKeyword && matchesType && matchesDate;
    });

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar ${isDragging ? 'bg-primary/10 border-2 border-dashed border-primary m-4 rounded-2xl transition-all' : ''}`}
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

            {filteredMessages.length === 0 && (messageSearchQuery || messageFilters.type !== 'all' || messageFilters.date !== 'all') && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                    <FiSearch className="w-12 h-12 mb-4 opacity-20" />
                    <p>No messages match your search criteria.</p>
                </div>
            )}

            {filteredMessages
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
                                                src={msg.sender.profilePicture.startsWith('data:') || msg.sender.profilePicture.startsWith('http')
                                                    ? msg.sender.profilePicture
                                                    : `${import.meta.env.VITE_SOCKET_URL}${msg.sender.profilePicture}`
                                                }
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${msg.sender.username}&background=random`;
                                                }}
                                            />
                                        ) : (
                                            <span className="text-[10px] font-bold text-secondary">{msg.sender.username[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative group`}>
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
                                            {msg.fileUrl && (
                                                <button
                                                    onClick={() => handleSaveClick(msg)}
                                                    className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center"
                                                >
                                                    <FiSave className="mr-2 w-4 h-4" />
                                                    Save
                                                </button>
                                            )}
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

            {/* File Viewer Modal */}
            <FileViewerModal
                isOpen={fileViewerOpen}
                onClose={() => setFileViewerOpen(false)}
                file={currentFile}
            />
        </div>
    );
};

export default MessageList;
