const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public routes
router.post("/", createOrder); // Create order (no auth required)
router.get("/my-orders", protect, getMyOrders); // Get user's orders (requires auth)

// Protected routes (admin only)
router.get("/", protect, admin, getAllOrders); // Get all orders
router.get("/:id", protect, getOrderById); // Get order by ID
router.put("/:id/status", protect, admin, updateOrderStatus); // Update order status

module.exports = router; 