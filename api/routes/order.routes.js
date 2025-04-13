const express = require("express")
const router = express.Router()
const Order = require("../models/Order.model")
const User = require("../models/User.model")
const Product = require("../models/Product.model")
const Affiliate = require("../models/Affiliate.model")
const { protect, admin } = require("../middleware/auth.middleware")
const { sendOrderStatusEmail } = require("../utils/email")

// @route   GET /api/orders
// @desc    Get all orders (admin only)
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

    // Get orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)
      .populate("user", "firstName lastName email")
      .populate("affiliateId")

    // Get total count for pagination
    const total = await Order.countDocuments(filter)

    res.json({
      orders,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/orders/my-orders
// @desc    Get logged in user's orders
// @access  Private
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email")
      .populate("affiliateId")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order belongs to the logged in user or if the user is an admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to access this order" })
    }

    res.json(order)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Order not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put("/:id/status", [protect, admin], async (req, res) => {
  const { status, trackingNumber } = req.body

  if (!status) {
    return res.status(400).json({ message: "Status is required" })
  }

  try {
    const order = await Order.findById(req.params.id).populate("user", "email")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update order status
    order.status = status

    // Add tracking number if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber
    }

    const updatedOrder = await order.save()

    // Send email notification
    if (order.user && order.user.email) {
      await sendOrderStatusEmail(order.user.email, updatedOrder)
    }

    res.json({
      order: updatedOrder,
      message: "Order status updated successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Order not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post("/", protect, async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentDetails,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    affiliateCode,
  } = req.body

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: "No order items" })
  }

  try {
    // Check if all products exist and have enough stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product)

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product.name}` })
      }
    }

    // Find affiliate if code provided
    let affiliate = null
    if (affiliateCode) {
      affiliate = await Affiliate.findOne({ referralCode: affiliateCode, status: "approved" })
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      items: orderItems.map((item) => ({
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      subtotal: itemsPrice,
      tax: taxPrice,
      shipping: shippingPrice,
      total: totalPrice,
      affiliateId: affiliate ? affiliate._id : null,
    })

    const createdOrder = await order.save()

    // Update product stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product)
      product.stock -= item.quantity
      await product.save()
    }

    // Add referral to affiliate if applicable
    if (affiliate) {
      const commissionAmount = (totalPrice * affiliate.commission) / 100

      affiliate.referrals.push({
        order: createdOrder._id,
        customer: req.user._id,
        amount: totalPrice,
        commission: commissionAmount,
      })

      affiliate.earnings += commissionAmount
      await affiliate.save()
    }

    res.status(201).json(createdOrder)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
