const express = require("express")
const router = express.Router()
const { check, validationResult } = require("express-validator")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User.model")
const BlacklistedToken = require("../models/BlacklistedToken.model")
const { sendVerificationEmail, sendPasswordResetEmail, sendCredentialsEmail } = require("../utils/email")
const { protect } = require("../middleware/auth.middleware")
const { generateSecurePassword } = require("../utils/password")
const { blacklistToken } = require("../utils/auth")

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  })
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
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
console.log('reqb.doy register==??> ', req.body)
    const { firstName, lastName, email } = req.body

    try {
      // Check if user already exists
      let user = await User.findOne({ email })
      console.log('suser in register>>>', user)
      if (user) {
        return res.status(400).json({ message: "User already exists" })
      }

      // Generate verification token and secure password
      const verificationToken = crypto.randomBytes(20).toString("hex")
      const password = generateSecurePassword()
// console.log('vrifitionken  ', verificationToken,'pasword',password)
      // Create new user
      user = new User({
        firstName,
        lastName,
        email,
        password,
        verificationToken,
      })

      
      await user.save()

      // Send verification email
      await sendVerificationEmail(email, verificationToken)
      
      // Send credentials email
      await sendCredentialsEmail(email, password)

      // Return token
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token: generateToken(user._id),
        message: "Registration successful. Please check your email for verification and login credentials.",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  
  async (req, res) => {
    // const errors = validationResult(req)
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() })
    // }

    const { email, password } = req.body
console.log('email', email, 'password', password)
    try {
      // Check if user exists
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      // Check if password matches
      const isMatch = await user.comparePassword(password)
      console.log(isMatch)
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      // Return user data and token
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        token: generateToken(user._id),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token })

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" })
    }

    user.isVerified = true
    user.verificationToken = undefined
    await user.save()

    res.json({ message: "Email verified successfully. You can now log in." })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", [check("email", "Please include a valid email").isEmail()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { email } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex")
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
    await user.save()

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken)

    res.json({ message: "Password reset email sent" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  "/reset-password/:token",
  [check("password", "Password must be at least 6 characters").isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { password } = req.body

    try {
      const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() },
      })

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" })
      }

      // Update password
      user.password = password
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save()

      res.json({ message: "Password reset successful. You can now log in with your new password." })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password")
    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user and blacklist token
// @access  Private
router.post("/logout", protect, async (req, res) => {
  try {
    // Get the token from the request header
    const token = req.headers.authorization.split(" ")[1]
    
    // Blacklist the token
    await blacklistToken(token)
    
    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Server error during logout" })
  }
})

module.exports = router
