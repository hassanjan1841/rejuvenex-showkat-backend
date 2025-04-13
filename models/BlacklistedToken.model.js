const mongoose = require("mongoose")

const BlacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    blacklistedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Create index on token for faster lookups
BlacklistedTokenSchema.index({ token: 1 })

// Create index on expiresAt for automatic cleanup
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema) 