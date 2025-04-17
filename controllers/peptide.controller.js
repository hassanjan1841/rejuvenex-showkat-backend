const Peptide = require("../models/Peptide.model")
const { uploadToCloudinary } = require("../utils/cloudinary")

const { catchAsync } = require('../utils/catchAsync');

// Get all peptides with pagination and filters
exports.getPeptides = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, category, status, search } = req.query
  const query = {}

  if (category) query.category = category
  if (status) query.status = status
  if (search) {
    query.$text = { $search: search }
  }

  const peptides = await Peptide.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("category", "name slug")
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName")

  const total = await Peptide.countDocuments(query)

  res.json({
    peptides,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total,
  })
})

// Get a single peptide by ID
exports.getPeptideById = catchAsync(async (req, res) => {
  const peptide = await Peptide.findById(req.params.id)
    .populate("category", "name slug")
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName")

  if (!peptide) {
    return res.status(404).json({ message: "Peptide not found" })
  }

  res.json(peptide)
})

// Create a new peptide
exports.createPeptide = catchAsync(async (req, res) => {
  const { sections } = req.body
  console.log('req.body', sections);
const {
  name,
  description,
  benefits,
  dosage,
  sideEffects,
  storage,
  category,
  scientificName,
  molecularWeight,
  sequence,
  purity,
  researchPapers,} = sections

  // Handle image uploads
  const images = []
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToCloudinary(file)
      images.push(result.secure_url)
    }
  }
  console.log('images', images);

  const peptide = new Peptide({
    name,
    description,
    benefits,
    dosage,
    sideEffects,
    storage,
    category,
    scientificName,
    molecularWeight,
    sequence,
    purity,
    researchPapers,
    images,
    createdBy: req.user._id,
  })

  await peptide.save()
  res.status(201).json(peptide)
})

// Update a peptide
exports.updatePeptide = catchAsync(async (req, res) => {
  const {
    name,
    description,
    benefits,
    dosage,
    sideEffects,
    storage,
    category,
    status,
    scientificName,
    molecularWeight,
    sequence,
    purity,
    researchPapers,
  } = req.body

  const updateData = {
    name,
    description,
    benefits,
    dosage,
    sideEffects,
    storage,
    category,
    status,
    scientificName,
    molecularWeight,
    sequence,
    purity,
    researchPapers,
    updatedBy: req.user._id,
  }

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    const images = []
    for (const file of req.files) {
      const result = await uploadToCloudinary(file)
      images.push(result.secure_url)
    }
    updateData.images = images
  }

  const peptide = await Peptide.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })

  if (!peptide) {
    return res.status(404).json({ message: "Peptide not found" })
  }

  res.json(peptide)
})

// Delete a peptide
exports.deletePeptide = catchAsync(async (req, res) => {
  const peptide = await Peptide.findByIdAndDelete(req.params.id)

  if (!peptide) {
    return res.status(404).json({ message: "Peptide not found" })
  }

  res.json({ message: "Peptide deleted successfully" })
})

// Get the latest peptide content
exports.getPeptideContent = catchAsync(async (req, res) => {
  const content = await Peptide.findOne().sort({ createdAt: -1 });

  if (!content) {
    return res.status(404).json({
      status: 'error',
      message: 'No content found'
    });
  }

  res.json({
    status: 'success',
    data: content
  });
});

// Save new peptide content
exports.savePeptideContent = catchAsync(async (req, res) => {
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid sections data'
    });
  }

  // Add order to sections if not present
  const sectionsWithOrder = sections.map((section, index) => ({
    ...section,
    order: index
  }));

  const content = await Peptide.create({
    sections: sectionsWithOrder
  });

  res.status(201).json({
    status: 'success',
    data: content
  });
});

// Update existing peptide content
exports.updatePeptideContent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { sections } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid sections data'
    });
  }

  const sectionsWithOrder = sections.map((section, index) => ({
    ...section,
    order: index
  }));

  const content = await Peptide.findByIdAndUpdate(
    id,
    {
      sections: sectionsWithOrder,
      updatedAt: Date.now()
    },
    { new: true }
  );

  if (!content) {
    return res.status(404).json({
      status: 'error',
      message: 'Content not found'
    });
  }

  res.json({
    status: 'success',
    data: content
  });
}); 