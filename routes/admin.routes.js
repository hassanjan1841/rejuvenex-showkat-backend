const express = require("express")
const router = express.Router()
const User = require("../models/User.model")
const Product = require("../models/Product.model")
const Order = require("../models/Order.model")
const Affiliate = require("../models/Affiliate.model")
const { protect, admin } = require("../middleware/auth.middleware")

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get("/dashboard", [protect, admin], async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments()
    const productCount = await Product.countDocuments()
    const orderCount = await Order.countDocuments()
    const affiliateCount = await Affiliate.countDocuments()

    // Get recent orders
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "firstName lastName")

    // Get sales data
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth },
    })

    const monthlySales = monthlyOrders.reduce((total, order) => total + order.total, 0)

    // Get pending approvals
    const pendingAffiliates = await Affiliate.countDocuments({ status: "pending" })

    // Get low stock products
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).limit(5)

    res.json({
      counts: {
        users: userCount,
        products: productCount,
        orders: orderCount,
        affiliates: affiliateCount,
      },
      recentOrders,
      monthlySales,
      pendingApprovals: pendingAffiliates,
      lowStockProducts,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get("/users", [protect, admin], async (req, res) => {
  try {
    const { role, limit = 10, page = 1 } = req.query

    // Build filter object
    const filter = {}

    if (role) {
      filter.role = role
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Get users
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)

    // Get total count for pagination
    const total = await User.countDocuments(filter)

    res.json({
      users,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.put("/users/:id/role", [protect, admin], async (req, res) => {
  const { role } = req.body

  if (!role || !["customer", "affiliate", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" })
  }

  try {
    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update user role
    user.role = role
    const updatedUser = await user.save()

    res.json({
      user: updatedUser,
      message: `User role updated to ${role}`,
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete("/users/:id", [protect, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" })
    }

    await user.remove()

    res.json({ message: "User removed" })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
