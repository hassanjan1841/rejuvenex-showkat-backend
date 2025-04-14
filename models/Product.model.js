const mongoose = require("mongoose")

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    dosage: {
      type: String,
      default: "",
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    images: [
      {
        type: String,
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema)

module.exports = Product
