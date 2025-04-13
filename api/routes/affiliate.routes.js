const express = require("express")
const router = express.Router()
const crypto = require("crypto")
const Affiliate = require("../models/Affiliate.model")
const User = require("../models/User.model")
const { protect, admin, affiliate } = require("../middleware/auth.middleware")
const { sendAffiliateStatusEmail } = require("../utils/email")

// @route   POST /api/affiliates/apply
// @desc    Apply to become an affiliate
// @access  Private
router.post("/apply", protect, async (req, res) => {
  const { website, socialMedia } = req.body

  try {
    // Check if user is already an affiliate
    const existingAffiliate = await Affiliate.findOne({ user: req.user._id })

    if (existingAffiliate) {
      return res.status(400).json({ message: "You are already an affiliate" })
    }

    // Generate unique referral code
    const referralCode = crypto.randomBytes(4).toString("hex").toUpperCase()

    // Create affiliate
    const newAffiliate = new Affiliate({
      user: req.user._id,
      website: website || "",
      socialMedia: socialMedia || "",
      referralCode,
    })

    const createdAffiliate = await newAffiliate.save()

    // Update user role
    await User.findByIdAndUpdate(req.user._id, { role: "affiliate" })

    res.status(201).json({
      affiliate: createdAffiliate,
      message: "Affiliate application submitted successfully. Your application is pending approval.",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/affiliates/me
// @desc    Get logged in user's affiliate info
// @access  Private/Affiliate
router.get("/me", [protect, affiliate], async (req, res) => {
  try {
    const affiliateInfo = await Affiliate.findOne({ user: req.user._id }).populate("user", "firstName lastName email")

    if (!affiliateInfo) {
      return res.status(404).json({ message: "Affiliate not found" })
    }

    res.json(affiliateInfo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/affiliates
// @desc    Get all affiliates (admin only)
// @access  Private/Admin
router.get("/", [protect, admin], async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query

    // Build filter object
    const filter = {}

    if (status) {
      filter.status = status
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Get affiliates
    const affiliates = await Affiliate.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)
      .populate("user", "firstName lastName email")

    // Get total count for pagination
    const total = await Affiliate.countDocuments(filter)

    res.json({
      affiliates,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/affiliates/:id
// @desc    Get affiliate by ID (admin only)
// @access  Private/Admin
router.get("/:id", [protect, admin], async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id).populate("user", "firstName lastName email")

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" })
    }

    res.json(affiliate)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Affiliate not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/affiliates/:id/status
// @desc    Update affiliate status (admin only)
// @access  Private/Admin
router.put("/:id/status", [protect, admin], async (req, res) => {
  const { status } = req.body

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" })
  }

  try {
    const affiliate = await Affiliate.findById(req.params.id).populate("user", "email")

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" })
    }

    // Update affiliate status
    affiliate.status = status
    const updatedAffiliate = await affiliate.save()

    // Send email notification
    if (affiliate.user && affiliate.user.email && ["approved", "rejected"].includes(status)) {
      await sendAffiliateStatusEmail(affiliate.user.email, status)
    }

    res.json({
      affiliate: updatedAffiliate,
      message: `Affiliate status updated to ${status}`,
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Affiliate not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/affiliates/:id/commission
// @desc    Update affiliate commission rate (admin only)
// @access  Private/Admin
router.put("/:id/commission", [protect, admin], async (req, res) => {
  const { commission } = req.body

  if (commission === undefined || commission < 0 || commission > 100) {
    return res.status(400).json({ message: "Invalid commission rate" })
  }

  try {
    const affiliate = await Affiliate.findById(req.params.id)

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" })
    }

    // Update commission rate
    affiliate.commission = commission
    const updatedAffiliate = await affiliate.save()

    res.json({
      affiliate: updatedAffiliate,
      message: `Affiliate commission rate updated to ${commission}%`,
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Affiliate not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/affiliates/validate/:code
// @desc    Validate affiliate referral code
// @access  Public
router.get("/validate/:code", async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({
      referralCode: req.params.code,
      status: "approved",
    }).select("referralCode")

    if (!affiliate) {
      return res.status(404).json({ message: "Invalid affiliate code" })
    }

    res.json({
      valid: true,
      code: affiliate.referralCode,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
