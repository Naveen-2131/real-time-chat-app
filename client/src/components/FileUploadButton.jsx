import { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { FiPaperclip, FiX, FiFile, FiImage, FiVideo } from 'react-icons/fi';

const FileUploadButton = forwardRef(({ onFileSelect, file }, ref) => {
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);
    // Generate unique ID for this instance
    const inputId = useRef(`file-upload-${Math.random().toString(36).substr(2, 9)}`);

    // Effect to handle preview generation and input clearing based on prop
    useEffect(() => {
        if (file) {
            // Generate preview if it's an image
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setPreview(null);
            }
        } else {
            // Clear preview and input if file prop is null
            setPreview(null);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    }, [file]);

    // Expose reset method (though prop control is preferred)
    useImperativeHandle(ref, () => ({
        reset: () => {
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            // We don't clear state here because we rely on parent to pass null
        }
    }));

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (!selectedFile) return;

        // Validate file size (50MB max)
        if (selectedFile.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(selectedFile.type)) {
            alert('Invalid file type. Allowed: images, videos, PDF, Word documents');
            return;
        }

        // Notify parent
        onFileSelect(selectedFile);
    };

    const clearFile = (e) => {
        e.preventDefault(); // Prevent form submission if inside form
        onFileSelect(null);
    };

    const getFileIcon = () => {
        if (!file) return <FiPaperclip className="w-5 h-5" />;

        if (file.type.startsWith('image/')) return <FiImage className="w-5 h-5" />;
        if (file.type.startsWith('video/')) return <FiVideo className="w-5 h-5" />;
        return <FiFile className="w-5 h-5" />;
    };

    return (
        <div className="relative">
            <input
                type="file"
                id={inputId.current}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx"
                ref={inputRef}
            />

            {file ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-700 rounded-lg">
                    {preview ? (
                        <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    ) : (
                        <div className="w-12 h-12 bg-slate-600 rounded flex items-center justify-center">
                            {getFileIcon()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                    <button
                        type="button" // Important: prevent form submission
                        onClick={clearFile}
                        className="p-1 hover:bg-slate-600 rounded"
                    >
                        <FiX className="w-4 h-4 text-slate-300" />
                    </button>
                </div>
            ) : (
                <label
                    htmlFor={inputId.current}
                    className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                    <FiPaperclip className="w-5 h-5 text-slate-300" />
                </label>
            )}
        </div>
    );
});

FileUploadButton.displayName = 'FileUploadButton';

export default FileUploadButton;
