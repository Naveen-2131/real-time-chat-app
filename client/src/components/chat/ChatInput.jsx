import React, { useRef, useState, useEffect } from 'react';
import { FiX, FiImage, FiVideo, FiFile } from 'react-icons/fi';
import FileUploadButton from '../FileUploadButton.jsx';

const ChatInput = ({
    handleSendMessage,
    fileUploadRef,
    setSelectedFile,
    selectedFile,
    newMessage,
    setNewMessage,
    socket,
    selectedChat
}) => {
    const typingTimeoutRef = useRef(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }
    }, [selectedFile]);

    const handleTyping = () => {
        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Emit typing event
        socket.emit('typing', selectedChat._id);

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', selectedChat._id);
        }, 2000);
    };

    const getFileIcon = () => {
        if (!selectedFile) return null;
        if (selectedFile.type.startsWith('image/')) return <FiImage className="w-5 h-5" />;
        if (selectedFile.type.startsWith('video/')) return <FiVideo className="w-5 h-5" />;
        return <FiFile className="w-5 h-5" />;
    };

    return (
        <div className="p-2 sm:p-4 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 z-10 flex-shrink-0">
            {selectedFile && (
                <div className="max-w-4xl mx-auto mb-3 animate-fade-in-up">
                    <div className="flex items-center space-x-3 p-2 bg-slate-700/50 rounded-xl border border-slate-600/50">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-600 shadow-sm" />
                        ) : (
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-primary">
                                {getFileIcon()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="p-2 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
            <form onSubmit={handleSendMessage} className="grid grid-cols-[auto_1fr_auto] gap-3 items-end max-w-4xl mx-auto">
                <div className="mb-1">
                    <FileUploadButton
                        ref={fileUploadRef}
                        onFileSelect={setSelectedFile}
                        file={selectedFile}
                        hidePreview={true}
                    />
                </div>
                <div className="bg-slate-700/50 rounded-2xl border border-transparent focus-within:border-primary/50 focus-within:bg-slate-800 transition-all duration-200 min-w-0">
                    <textarea
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
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
                    className="mb-1 p-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all transform hover:scale-105 active:scale-95 flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
