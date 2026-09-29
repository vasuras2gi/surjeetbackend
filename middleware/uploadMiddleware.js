const multer = require('multer');
const path = require('path');

// Storage engine define karein
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // Uploads folder mein files save hongi
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File type validation (Sirf images allow karein)
const checkFileType = (file, cb) => {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images Only!'));
    }
};

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

module.exports = upload;