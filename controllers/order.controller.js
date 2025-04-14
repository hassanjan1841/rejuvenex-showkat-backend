const Order = require('../models/order.model');
const { sendOrderConfirmationEmail, sendOrderStatusEmail, sendOrderNotificationToAdmin } = require('../utils/email');

const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      status = 'pending'
    } = req.body;

    // Create the order
    const order = new Order({
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      status
    });

    await order.save();

    // Send confirmation email to customer if email is provided
    if (shippingAddress.email) {
      await sendOrderConfirmationEmail(order);
    }

    // Send notification to admin
    await sendOrderNotificationToAdmin(order);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
}; 