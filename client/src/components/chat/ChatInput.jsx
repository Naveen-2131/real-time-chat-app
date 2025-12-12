import React, { useRef } from 'react';
import FileUploadButton from '../FileUploadButton';

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

    return (
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
                    className="mb-1 p-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all transform hover:scale-105 active:scale-95"
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
