import { useEffect } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';

const FileViewerModal = ({ isOpen, onClose, file }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !file) return null;

    const handleDownload = async () => {
        try {
            // For data URLs, download directly
            if (file.url.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = file.url;
                link.download = file.name || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            // For regular URLs, fetch and create blob
            const response = await fetch(file.url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = file.name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: try direct download
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.name || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const renderContent = () => {
        if (file.type === 'image') {
            return (
                <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
            );
        }

        if (file.type === 'video') {
            return (
                <video
                    src={file.url}
                    controls
                    className="max-w-full max-h-[80vh] rounded-lg"
                    autoPlay
                >
                    Your browser does not support the video tag.
                </video>
            );
        }

        if (file.type === 'pdf') {
            return (
                <iframe
                    src={file.url}
                    className="w-full h-[80vh] rounded-lg bg-white"
                    title={file.name}
                />
            );
        }

        // For other file types, show download option
        return (
            <div className="text-center p-8 bg-slate-800 rounded-lg">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-bold text-white mb-2">{file.name}</h3>
                <p className="text-slate-400 mb-6">Preview not available for this file type</p>
                <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 mx-auto"
                >
                    <FiDownload className="w-5 h-5" />
                    Download File
                </button>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="relative max-w-7xl w-full">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close"
                >
                    <FiX className="w-8 h-8" />
                </button>

                {/* Download button */}
                <button
                    onClick={handleDownload}
                    className="absolute -top-12 right-14 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Download"
                >
                    <FiDownload className="w-6 h-6" />
                </button>

                {/* File name */}
                {file.name && (
                    <div className="absolute -top-12 left-0 text-white font-medium truncate max-w-md">
                        {file.name}
                    </div>
                )}

                {/* Content */}
                <div className="flex items-center justify-center">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;
