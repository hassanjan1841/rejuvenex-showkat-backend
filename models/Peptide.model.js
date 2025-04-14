const mongoose = require("mongoose")

const peptideSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    benefits: [{
      type: String,
      required: true,
    }],
    dosage: {
      type: String,
      required: true,
    },
    sideEffects: [{
      type: String,
    }],
    storage: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["research", "clinical", "experimental"],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
      default: "active",
    },
    images: [{
      type: String,
    }],
    scientificName: {
      type: String,
      required: true,
    },
    molecularWeight: {
      type: String,
      required: true,
    },
    sequence: {
      type: String,
      required: true,
    },
    purity: {
      type: String,
      required: true,
    },
    researchPapers: [{
      title: String,
      url: String,
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
)

// Add text index for search functionality
peptideSchema.index({ name: "text", description: "text", scientificName: "text" })

const Peptide = mongoose.models.Peptide || mongoose.model("Peptide", peptideSchema)

module.exports = Peptide
