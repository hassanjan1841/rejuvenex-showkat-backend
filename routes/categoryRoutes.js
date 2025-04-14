const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const { cleanupUploads } = require('../middleware/uploadMiddleware');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `category-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Protected routes (admin only)
router.post('/', protect, admin, upload.single('image'), cleanupUploads, createCategory);
router.put('/:id', protect, admin, upload.single('image'), cleanupUploads, updateCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router; 