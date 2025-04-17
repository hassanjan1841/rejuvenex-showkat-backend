const Product = require("../models/Product.model");
const Category = require("../models/Category.model");

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, dosage, sku, stock, tags, featured } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !sku) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    // Create new product
    const product = new Product({
      name,
      description,
      price,
      category,
      dosage,
      sku,
      stock: stock || 0,
      tags: tags || [],
      featured: featured || false,
      images: req.files ? req.files.map(file => file.path) : [],
    });

    await product.save();

    // Populate category details before sending response
    await product.populate('category', 'name');

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Get all products with optional filters
exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12,
      sortBy = 'newest',
      category 
    } = req.query;

    const filter = {};

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Sort options
    let sort = {};
    switch (sortBy) {
      case 'price-low':
        sort = { price: 1 };
        break;
      case 'price-high':
        sort = { price: -1 };
        break;
      case 'name':
        sort = { name: 1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Get paginated products
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('category', 'name');
      console.log('category',category,'prudctd',products)

    res.json({
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, dosage, sku, stock, tags, featured } = req.body;

    // If category is being updated, verify it exists
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
    }

    const updateData = {
      name,
      description,
      price,
      category,
      dosage,
      sku,
      stock,
      tags,
      featured,
    };

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => file.path);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
}; 