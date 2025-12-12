const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Use disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Check file type
function checkFileType(file, cb) {
    // Allowed mimetypes
    const allowedMimetypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'video/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif|mp4|pdf|doc|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type (relaxed: if extension matches and mimetype is generic application/octet-stream, allow it)
    const mimetypeAllowed = allowedMimetypes.includes(file.mimetype) || (file.mimetype === 'application/octet-stream' && extname);

    if (extname && mimetypeAllowed) {
        return cb(null, true);
    } else {
        cb('Error: Invalid file type! Allowed: Images, Videos, PDF, DOC, DOCX');
    }
}

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).any(); // Accept any field name

// Middleware wrapper to handle errors
const uploadMiddleware = (req, res, next) => {
    console.log('=== UPLOAD MIDDLEWARE ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body before upload:', req.body);

    upload(req, res, (err) => {
        console.log('After multer processing:');
        console.log('req.file:', req.file);
        console.log('req.files:', req.files);
        console.log('req.body:', req.body);

        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        } else if (err) {
            console.error('Upload error:', err);
            // Ensure err is a string
            const errorMessage = typeof err === 'string' ? err : (err.message || 'Unknown upload error');
            return res.status(400).json({ message: errorMessage });
        }

        // If files were uploaded, attach the first one to req.file for backward compatibility
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
            console.log('Attached req.file from req.files[0]');
        }

        next();
    });
};

module.exports = uploadMiddleware;
