const express = require("express")
const router = express.Router()
const { createPaymentIntent, verifyWebhookSignature } = require("../utils/stripe")
const { authMiddleware } = require("../middleware/auth.middleware")
const Order = require("../models/Order.model")
const { sendEmail, getOrderConfirmationEmailTemplate } = require("../utils/email")
const User = require("../models/User.model") // Import the User model

// Create a payment intent
router.post("/create-payment-intent", authMiddleware, async (req, res) => {
  try {
    const { amount, items, shippingDetails } = req.body

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    // Create metadata for the payment intent
    const metadata = {
      userId: req.user.id,
      items: JSON.stringify(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
        })),
      ),
      shipping: JSON.stringify(shippingDetails),
    }

    const paymentIntent = await createPaymentIntent(amountInCents, "usd", metadata)

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    res.status(500).json({ message: "Failed to create payment intent", error: error.message })
  }
})

// Stripe webhook handler
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"]

    // Verify the webhook signature
    const event = verifyWebhookSignature(req.body, signature)

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object

        // Extract metadata
        const { userId, items: itemsJson, shipping: shippingJson } = paymentIntent.metadata
        const items = JSON.parse(itemsJson)
        const shipping = JSON.parse(shippingJson)

        // Create order in database
        const order = await Order.create({
          user: userId,
          items: items.map((item) => ({
            product: item.id,
            name: item.name,
            quantity: item.quantity,
            price: paymentIntent.amount / 100 / items.reduce((sum, i) => sum + i.quantity, 0), // Approximate price per item
          })),
          shipping,
          payment: {
            method: "Credit Card",
            transactionId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
          },
          status: "processing",
          subtotal: (paymentIntent.amount / 100) * 0.9, // Approximate subtotal (90% of total)
          tax: (paymentIntent.amount / 100) * 0.1, // Approximate tax (10% of total)
          shipping: 0, // Free shipping in this example
          total: paymentIntent.amount / 100,
        })

        // Send order confirmation email
        const user = await User.findById(userId)
        if (user) {
          const emailHtml = getOrderConfirmationEmailTemplate({
            ...order.toObject(),
            user,
          })

          await sendEmail({
            to: user.email,
            subject: `Order Confirmation #${order._id}`,
            html: emailHtml,
          })
        }

        console.log("Payment succeeded and order created:", order._id)
        break

      case "payment_intent.payment_failed":
        const failedPaymentIntent = event.data.object
        console.log("Payment failed:", failedPaymentIntent.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error("Error handling webhook:", error)
    res.status(400).json({ message: "Webhook error", error: error.message })
  }
})

module.exports = router
