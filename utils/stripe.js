const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

/**
 * Create a payment intent
 * @param {Number} amount - Amount in cents
 * @param {String} currency - Currency code (default: 'usd')
 * @param {Object} metadata - Additional metadata
 * @returns {Promise} - Resolves with the payment intent
 */
const createPaymentIntent = async (amount, currency = "usd", metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error("Error creating payment intent:", error)
    throw error
  }
}

/**
 * Verify a Stripe webhook signature
 * @param {String} payload - Request body as string
 * @param {String} signature - Stripe signature from headers
 * @returns {Object} - The verified event
 */
const verifyWebhookSignature = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
    return event
  } catch (error) {
    console.error("Error verifying webhook signature:", error)
    throw error
  }
}

module.exports = {
  createPaymentIntent,
  verifyWebhookSignature,
  stripe, // Export the stripe instance for additional operations
}
