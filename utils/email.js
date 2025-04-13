const nodemailer = require("nodemailer")

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.html - Email HTML content
 * @param {String} options.text - Email text content (fallback)
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `Rejuvenexx <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: ", info.messageId)
    return info
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Email templates
const getVerificationEmailTemplate = (userName, verificationUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for registering with Rejuvenexx. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
      </div>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Best regards,<br>The Rejuvenexx Team</p>
    </div>
  `
}

const getPasswordResetEmailTemplate = (userName, resetUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
      <p>Hello ${userName},</p>
      <p>You requested a password reset. Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>The Rejuvenexx Team</p>
    </div>
  `
}

const getOrderConfirmationEmailTemplate = (order) => {
  const items = order.items
    .map(
      (item) =>
        `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`,
    )
    .join("")

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
      <p>Hello ${order.user.firstName},</p>
      <p>Thank you for your order! We've received your order and are processing it now.</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> ${order._id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Order Status:</strong> ${order.status}</p>
      </div>
      
      <h3>Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Price</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 10px; text-align: right;">$${order.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
            <td style="padding: 10px; text-align: right;">$${order.shipping.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
            <td style="padding: 10px; text-align: right;">$${order.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${order.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
        <h3 style="margin-top: 0;">Shipping Address</h3>
        <p>${order.shipping.address}</p>
        <p>${order.shipping.city}, ${order.shipping.state} ${order.shipping.zipCode}</p>
        <p>${order.shipping.country}</p>
      </div>
      
      <p>If you have any questions about your order, please contact our customer service team.</p>
      <p>Best regards,<br>The Rejuvenexx Team</p>
    </div>
  `
}

module.exports = {
  sendEmail,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getOrderConfirmationEmailTemplate,
}
