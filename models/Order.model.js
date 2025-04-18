const mongoose = require("mongoose")

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
})

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    items: [OrderItemSchema],
    shippingAddress: {
      firstName: String,
      lastName: String,
      address: String,
      apartment: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
      email: String,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    paymentDetails: {
      transactionId: String,
      cardLast4: String,
      paypalEmail: String,
    },
    subtotal: {
      type: Number,
      required: false,
    },
    shipping: {
      type: Number,
      required: false,
    },
    tax: {
      type: Number,
      required: false,
    },
    total: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
    trackingNumber: String,
    notes: String,
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Affiliate",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Order", OrderSchema)
