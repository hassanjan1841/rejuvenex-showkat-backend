const express = require("express");
const router = express.Router();
const { sendContactEmail } = require("../utils/email");
const { body, validationResult } = require("express-validator");

// Contact form validation middleware
const contactValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("message").trim().notEmpty().withMessage("Message is required"),
];

// Contact form submission endpoint
router.post("/", contactValidation, async (req, res) => {
  try {
    // Check for validation errors
    // console.log('req.body', req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    
    const { name, email, subject, message } = req.body;
    
    // Send contact email
    const emailSent = await sendContactEmail(req.body);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send email. Please try again later." });
    }

    // Return success response
    res.status(200).json({ message: "Your message has been sent successfully. We'll get back to you soon!" });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ message: "An error occurred while processing your request. Please try again later." });
  }
});

module.exports = router; 