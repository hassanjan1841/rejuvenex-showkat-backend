const mongoose = require("mongoose")

const ResearchInfoSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String,
})

const PeptideSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    shortName: String,
    description: {
      type: String,
      required: true,
    },
    usage: {
      disclaimer: {
        type: String,
        required: true,
      },
      instructions: String,
    },
    researchInfo: [ResearchInfoSchema],
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
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

module.exports = mongoose.model("Peptide", PeptideSchema)
