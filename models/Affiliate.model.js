const mongoose = require("mongoose")

const AffiliateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    commission: {
      type: Number,
      default: 10, // 10% commission by default
    },
    earnings: {
      type: Number,
      default: 0,
    },
    referrals: [
      {
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        amount: Number,
        commission: Number,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    referralCode: {
      type: String,
      unique: true,
    },
    website: String,
    socialMedia: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

const Affiliate = mongoose.models.Affiliate || mongoose.model("Affiliate", AffiliateSchema)

module.exports = Affiliate
