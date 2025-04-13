const express = require("express")
const router = express.Router()
const multer = require("multer")
const { check, validationResult } = require("express-validator")
const User = require("../models/User.model")
const { protect } = require("../middleware/auth.middleware")
const { uploadImage } = require("../utils/cloudinary")

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname)
  },
})

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed"), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB max file size
  },
  fileFilter: fileFilter,
})

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  [
    check("firstName", "First name is required").not().isEmpty(),
    check("lastName", "Last name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { firstName, lastName, email, phone, address } = req.body

    try {
      // Check if email is already taken by another user
      if (email !== req.user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          return res.status(400).json({ message: "Email is already taken" })
        }
      }

      // Update user profile
      const user = await User.findById(req.user._id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      user.firstName = firstName
      user.lastName = lastName
      user.email = email
      if (phone) user.phone = phone
      if (address) user.address = address

      const updatedUser = await user.save()

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        isVerified: updatedUser.isVerified,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/users/profile/image
// @desc    Upload profile image
// @access  Private
router.put("/profile/image", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" })
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadImage(req.file.path, "rejuvenexx/profiles")

    // Update user profile
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.profileImage = imageUrl
    const updatedUser = await user.save()

    res.json({
      _id: updatedUser._id,
      profileImage: updatedUser.profileImage,
      message: "Profile image updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put(
  "/change-password",
  protect,
  [
    check("currentPassword", "Current password is required").exists(),
    check("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { currentPassword, newPassword } = req.body

    try {
      const user = await User.findById(req.user._id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Check if current password is correct
      const isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" })
      }

      // Update password
      user.password = newPassword
      await user.save()

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
