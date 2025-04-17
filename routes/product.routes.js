const express = require("express")
const router = express.Router()
const multer = require("multer")
const { check, validationResult } = require("express-validator")
const Product = require("../models/Product.model")
const { protect, admin } = require("../middleware/auth.middleware")
const { uploadImage } = require("../utils/cloudinary")
const Category = require("../models/Category.model")

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname)
  },
})

const fileFilter = (req, file, cb) => {
  // Accept images including webp
  if (file.mimetype.startsWith("image/") || file.mimetype === "image/webp") {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed"), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB max file size
  },
  fileFilter: fileFilter,
})

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, search, featured, limit = 10, page = 1 } = req.query

    // Build filter object
    const filter = { isActive: true }

    if (category && category !== 'all') {
      filter.category = category
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    if (featured === "true") {
      filter.featured = true
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Get products with populated category
    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)

    // Get total count for pagination
    const total = await Product.countDocuments(filter)

    res.json({
      products,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
    res.json(categories)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/products
// @desc    Create a product
// @access  Private/Admin
router.post(
  "/",
  [protect, admin],
  [
    check("name", "Name is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check("price", "Price is required and must be a number").isNumeric(),
    check("category", "Category is required").not().isEmpty(),
    check("sku", "SKU is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, description, price, category, dosage, sku, stock, tags, featured } = req.body

    try {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku })
      if (existingProduct) {
        return res.status(400).json({ message: "Product with this SKU already exists" })
      }

      // Create new product
      const product = new Product({
        name,
        description,
        price,
        category,
        dosage: dosage || "",
        sku,
        stock: stock || 0,
        tags: tags || [],
        featured: featured || false,
      })

      const createdProduct = await product.save()

      res.status(201).json(createdProduct)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private/Admin
router.put("/:id", [protect, admin], async (req, res) => {
  const { name, description, price, category, dosage, sku, stock, tags, featured, isActive } = req.body

  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Check if SKU already exists on another product
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku })
      if (existingProduct && existingProduct._id.toString() !== req.params.id) {
        return res.status(400).json({ message: "Product with this SKU already exists" })
      }
    }

    // Update product fields
    if (name) product.name = name
    if (description) product.description = description
    if (price) product.price = price
    if (category) product.category = category
    if (dosage !== undefined) product.dosage = dosage
    if (sku) product.sku = sku
    if (stock !== undefined) product.stock = stock
    if (tags) product.tags = tags
    if (featured !== undefined) product.featured = featured
    if (isActive !== undefined) product.isActive = isActive

    const updatedProduct = await product.save()

    res.json(updatedProduct)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/products/:id/images
// @desc    Upload product images
// @access  Private/Admin
router.post("/:id/images", [protect, admin], upload.array("images", 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one image" })
    }

    // Upload images to Cloudinary
    const uploadPromises = req.files.map((file) => uploadImage(file.path, "rejuvenexx/products"))
    const imageUrls = await Promise.all(uploadPromises)

    // Add new images to product
    product.images = [...product.images, ...imageUrls]

    const updatedProduct = await product.save()

    res.json({
      images: updatedProduct.images,
      message: "Product images uploaded successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/products/:id/images/:index
// @desc    Delete product image
// @access  Private/Admin
router.delete("/:id/images/:index", [protect, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const index = Number.parseInt(req.params.index)

    if (index < 0 || index >= product.images.length) {
      return res.status(400).json({ message: "Invalid image index" })
    }

    // Remove image from array
    product.images.splice(index, 1)

    const updatedProduct = await product.save()

    res.json({
      images: updatedProduct.images,
      message: "Product image deleted successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private/Admin
router.delete("/:id", [protect, admin], async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
