const Order = require("../models/Order.model");
const { sendOrderConfirmationEmail } = require("../utils/email");
const { createError } = require("../utils/error");
const { calculateOrderTotals } = require("../utils/orderCalculations");

// Create a new order
exports.createOrder = async (req, res, next) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      shipping,
      notes,
      affiliateId,
    } = req.body;

    // Calculate order totals
    const { subtotal, tax, total: calculatedTotal } = calculateOrderTotals(items, shipping);

    // Create new order
    const order = new Order({
      user: req.user ? req.user._id : null, // If user is logged in, associate order with user
      items,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      subtotal,
      shipping,
      tax,
      total: calculatedTotal,
      notes,
      affiliateId,
      status: "processing", // Default status
    });

    // Save order to database
    const savedOrder = await order.save();

    // Send confirmation email if email is provided
    if (shippingAddress && shippingAddress.email) {
      try {
        await sendOrderConfirmationEmail(shippingAddress.email, savedOrder);
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
        // Don't fail the order creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    next(createError(500, "Error creating order", error));
  }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "firstName lastName email")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(createError(500, "Error fetching orders", error));
  }
};

// Get user's orders
exports.getMyOrders = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(createError(401, "Authentication required"));
    }

    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(createError(500, "Error fetching user orders", error));
  }
};

// Get order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email")
      .populate("items.product", "name images");

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    // Check if user is authorized to view this order
    if (
      req.user &&
      (req.user.role === "admin" || order.user && order.user._id.toString() === req.user._id.toString())
    ) {
      res.status(200).json({
        success: true,
        order,
      });
    } else {
      return next(createError(403, "Not authorized to view this order"));
    }
  } catch (error) {
    next(createError(500, "Error fetching order", error));
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    // Update order status
    order.status = status || order.status;
    
    // Update tracking number if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    const updatedOrder = await order.save();

    // If order is shipped and user has email, send shipping notification
    if (
      status === "shipped" &&
      order.shippingAddress &&
      order.shippingAddress.email
    ) {
      try {
        // You would need to implement sendOrderStatusEmail in your email utils
        // await sendOrderStatusEmail(updatedOrder);
      } catch (emailError) {
        console.error("Failed to send shipping notification email:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    next(createError(500, "Error updating order status", error));
  }
}; 