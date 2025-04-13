const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const { check, validationResult } = require("express-validator")
const Peptide = require("../models/Peptide.model")
const { protect, admin } = require("../middleware/auth.middleware")
const { uploadImage } = require("../utils/cloudinary")
const { ensureDirectoryExists } = require("../utils/fileUtils")

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads")
ensureDirectoryExists(uploadsDir)

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Create a safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  },
})

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith("image/")) {
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

// @route   GET /api/peptides
// @desc    Get all peptides
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { search, limit = 10, page = 1 } = req.query

    // Build filter object
    const filter = { isActive: true }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Get peptides
    const peptides = await Peptide.find(filter).sort({ name: 1 }).limit(Number.parseInt(limit)).skip(skip)

    // Get total count for pagination
    const total = await Peptide.countDocuments(filter)

    res.json({
      peptides,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/peptides/:id
// @desc    Get peptide by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const peptide = await Peptide.findById(req.params.id).populate("relatedProducts")

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    res.json(peptide)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/peptides
// @desc    Create a peptide
// @access  Private/Admin
router.post(
  "/",
  [protect, admin],
  [
    check("name", "Name is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check("usage.disclaimer", "Usage disclaimer is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, shortName, description, usage, researchInfo, relatedProducts } = req.body

    try {
      // Create new peptide
      const peptide = new Peptide({
        name,
        shortName: shortName || "",
        description,
        usage: {
          disclaimer: usage.disclaimer,
          instructions: usage.instructions || "",
        },
        researchInfo: researchInfo || [],
        relatedProducts: relatedProducts || [],
      })

      const createdPeptide = await peptide.save()

      res.status(201).json(createdPeptide)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/peptides/:id
// @desc    Update a peptide
// @access  Private/Admin
router.put("/:id", [protect, admin], async (req, res) => {
  const { name, shortName, description, usage, researchInfo, relatedProducts, isActive } = req.body

  try {
    const peptide = await Peptide.findById(req.params.id)

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    // Update peptide fields
    if (name) peptide.name = name
    if (shortName !== undefined) peptide.shortName = shortName
    if (description) peptide.description = description
    if (usage) {
      if (usage.disclaimer) peptide.usage.disclaimer = usage.disclaimer
      if (usage.instructions !== undefined) peptide.usage.instructions = usage.instructions
    }
    if (researchInfo) peptide.researchInfo = researchInfo
    if (relatedProducts) peptide.relatedProducts = relatedProducts
    if (isActive !== undefined) peptide.isActive = isActive

    const updatedPeptide = await peptide.save()

    res.json(updatedPeptide)
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/peptides/:id/research-info
// @desc    Add research info to peptide
// @access  Private/Admin
router.post("/:id/research-info", [protect, admin], upload.single("image"), async (req, res) => {
  try {
    const peptide = await Peptide.findById(req.params.id)

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    const { title, content } = req.body

    // Upload image if provided
    let imageUrl = ""
    if (req.file) {
      imageUrl = await uploadImage(req.file.path, "rejuvenexx/peptides")
    }

    // Add research info
    peptide.researchInfo.push({
      title: title || "",
      content: content || "",
      image: imageUrl,
    })

    const updatedPeptide = await peptide.save()

    res.status(201).json({
      researchInfo: updatedPeptide.researchInfo,
      message: "Research info added successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/peptides/:id/research-info/:infoId
// @desc    Update research info
// @access  Private/Admin
router.put("/:id/research-info/:infoId", [protect, admin], upload.single("image"), async (req, res) => {
  try {
    const peptide = await Peptide.findById(req.params.id)

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    // Find research info
    const researchInfo = peptide.researchInfo.id(req.params.infoId)

    if (!researchInfo) {
      return res.status(404).json({ message: "Research info not found" })
    }

    const { title, content } = req.body

    // Upload image if provided
    if (req.file) {
      const imageUrl = await uploadImage(req.file.path, "rejuvenexx/peptides")
      researchInfo.image = imageUrl
    }

    // Update research info
    if (title !== undefined) researchInfo.title = title
    if (content !== undefined) researchInfo.content = content

    const updatedPeptide = await peptide.save()

    res.json({
      researchInfo: updatedPeptide.researchInfo,
      message: "Research info updated successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/peptides/:id/research-info/:infoId
// @desc    Delete research info
// @access  Private/Admin
router.delete("/:id/research-info/:infoId", [protect, admin], async (req, res) => {
  try {
    const peptide = await Peptide.findById(req.params.id)

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    // Find research info
    const researchInfo = peptide.researchInfo.id(req.params.infoId)

    if (!researchInfo) {
      return res.status(404).json({ message: "Research info not found" })
    }

    // Remove research info
    peptide.researchInfo.pull(req.params.infoId)

    const updatedPeptide = await peptide.save()

    res.json({
      researchInfo: updatedPeptide.researchInfo,
      message: "Research info deleted successfully",
    })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/peptides/:id
// @desc    Delete a peptide
// @access  Private/Admin
router.delete("/:id", [protect, admin], async (req, res) => {
  try {
    const peptide = await Peptide.findById(req.params.id)

    if (!peptide) {
      return res.status(404).json({ message: "Peptide not found" })
    }

    await peptide.remove()

    res.json({ message: "Peptide removed" })
  } catch (error) {
    console.error(error)
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Peptide not found" })
    }
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
