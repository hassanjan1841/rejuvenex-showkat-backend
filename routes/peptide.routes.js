const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const { check, validationResult } = require("express-validator")
const Peptide = require("../models/Peptide.model")
const { protect, admin, restrictTo } = require("../middleware/auth.middleware")
const { uploadImage } = require("../utils/cloudinary")
const { ensureDirectoryExists } = require("../utils/fileUtils")
const {
  getPeptides,
  getPeptideById,
  createPeptide,
  updatePeptide,
  deletePeptide,
  getPeptideContent,
  savePeptideContent,
  updatePeptideContent,
} = require("../controllers/peptide.controller")

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

// Public routes
router.get("/", getPeptides)
router.get("/:id", getPeptideById)

// New peptide content routes
router.get("/content/latest", getPeptideContent)

// Protected routes (admin only)
router.use(protect)
router.use(admin)

router.post("/", upload.array("images", 5), createPeptide)
router.put("/:id", upload.array("images", 5), updatePeptide)
router.delete("/:id", deletePeptide)

// @route   POST /api/peptides/:id/research-info
// @desc    Add research info to peptide
// @access  Private/Admin
router.post("/:id/research-info", upload.single("image"), async (req, res) => {
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
router.put("/:id/research-info/:infoId", upload.single("image"), async (req, res) => {
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
router.delete("/:id/research-info/:infoId", async (req, res) => {
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

// New peptide content routes
router.post("/content", savePeptideContent)
router.put("/content/:id", updatePeptideContent)

module.exports = router
