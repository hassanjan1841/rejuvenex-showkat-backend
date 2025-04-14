const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const peptideRoutes = require("./routes/peptide.routes");
const orderRoutes = require("./routes/order.routes");
const affiliateRoutes = require("./routes/affiliate.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const adminRoutes = require("./routes/admin.routes");
const contactRoutes = require("./routes/contact.routes");
const connectDB = require("./utils/db");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Express on Vercel"));

// Connect to MongoDB
console.log(process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Special handling for Stripe webhooks (raw body)
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));

// Regular body parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB()

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/peptides", peptideRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/affiliates", affiliateRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
