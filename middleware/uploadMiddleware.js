const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cleanup uploaded files after they're processed
const cleanupUploads = (req, res, next) => {
  if (req.file) {
    res.on('finish', () => {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error('Error deleting uploaded file:', err);
        }
      });
    });
  }
  next();
};

module.exports = {
  cleanupUploads
}; 