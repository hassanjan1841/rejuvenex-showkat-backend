const nodemailer = require("nodemailer")
const dns = require('dns').promises;

// Create a more robust email transporter with better error handling
const createEmailTransporter = async () => {
  console.log('Creating email transporter...');
  
  // Check if we have the required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email configuration missing. Please check your .env file.");
    return null;
  }

  // Verify DNS resolution first
  try {
    console.log('Verifying DNS resolution for smtp.gmail.com...');
    const dnsResult = await dns.lookup('smtp.gmail.com');
    console.log('DNS resolution successful:', dnsResult);
  } catch (error) {
    console.error('DNS resolution failed:', error);
    throw new Error('Cannot resolve smtp.gmail.com. Please check your internet connection and DNS settings.');
  }

  // Create the transporter with explicit host and port
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
      minVersion: 'TLSv1.2'
    },
    debug: process.env.NODE_ENV !== "production", // Only enable debug in development
  });

  // Verify the transporter configuration
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log("SMTP server is ready to take our messages");
    return transporter;
  } catch (error) {
    console.error("SMTP connection error:", error);
    console.error("Please check your email credentials in the .env file.");
    console.error("For Gmail, make sure you're using an App Password, not your regular password.");
    console.error("See README.md for instructions on setting up Gmail App Password.");
    return null;
  }
};

// Create the transporter
let transporter = null;

// Initialize the transporter
const initTransporter = async () => {
  if (!transporter) {
    transporter = await createEmailTransporter();
  }
  return transporter;
};

// Helper function to send emails with better error handling
const sendEmail = async (mailOptions) => {
  try {
    // Ensure transporter is initialized
    const emailTransporter = await initTransporter();
    
    if (!emailTransporter) {
      console.error("Email transporter not configured. Skipping email send.");
      return false;
    }

    console.log(`Sending email to: ${mailOptions.to}`);
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    
    // Provide more helpful error messages
    if (error.code === 'EAUTH') {
      console.error("Authentication failed. Please check your email credentials.");
      console.error("For Gmail, make sure you're using an App Password, not your regular password.");
      console.error("See README.md for instructions on setting up Gmail App Password.");
    } else if (error.code === 'ECONNECTION') {
      console.error("Connection failed. Please check your internet connection and try again.");
    } else if (error.code === 'ESOCKET') {
      console.error("Socket error. The email server might be down or unreachable.");
    } else if (error.code === 'EDNS') {
      console.error("DNS resolution error. Please check your internet connection and DNS settings.");
    }
    
    return false;
  }
};

// Define all email functions
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - Rejuvenexx",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up with Rejuvenexx. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If you did not create an account, please ignore this email.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendOrderStatusEmail = async (email, order) => {
  const statusMessages = {
    processing: "Your order is being processed",
    shipped: "Your order has been shipped",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Update: ${statusMessages[order.status]} - Rejuvenexx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Order Update</h2>
          <p>Your order #${order._id.toString().slice(-6).toUpperCase()} has been ${order.status}.</p>
          
          ${order.status === "shipped" ? `<p>Tracking Number: ${order.trackingNumber}</p>` : ""}
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <h3>Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left; padding: 8px;">Product</th>
                <th style="text-align: center; padding: 8px;">Quantity</th>
                <th style="text-align: right; padding: 8px;">Price</th>
              </tr>
              ${order.items
                .map(
                  (item) => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px;">${item.name}</td>
                  <td style="text-align: center; padding: 8px;">${item.quantity}</td>
                  <td style="text-align: right; padding: 8px;">$${item.price.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Subtotal:</td>
                <td style="text-align: right; padding: 8px;">$${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Shipping:</td>
                <td style="text-align: right; padding: 8px;">$${order.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Tax:</td>
                <td style="text-align: right; padding: 8px;">$${order.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Total:</td>
                <td style="text-align: right; padding: 8px; font-weight: bold;">$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p>Thank you for shopping with Rejuvenexx!</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset - Rejuvenexx",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Reset Your Password</h2>
          <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendAffiliateStatusEmail = async (email, status) => {
  const statusMessages = {
    approved: "Your affiliate application has been approved",
    rejected: "Your affiliate application has been rejected",
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Affiliate Status Update: ${statusMessages[status]} - Rejuvenexx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Affiliate Status Update</h2>
          ${
            status === "approved"
              ? `
            <p>Congratulations! Your application to become a Rejuvenexx affiliate has been approved.</p>
            <p>You can now log in to your affiliate dashboard to access your unique referral links and start earning commissions.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/affiliate/dashboard" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Affiliate Dashboard</a>
            </div>
          `
              : `
            <p>We regret to inform you that your application to become a Rejuvenexx affiliate has been rejected.</p>
            <p>If you have any questions or would like more information about why your application was not approved, please contact our support team.</p>
          `
          }
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

const sendCredentialsEmail = async (email, password) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Rejuvenexx Account Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #000, #0066cc); padding: 20px; color: white; text-align: center;">
          <h1>Rejuvenexx</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2>Welcome to Rejuvenexx!</h2>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p style="color: #d32f2f; font-weight: bold;">Important: For your security, please change your password immediately after logging in.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Your Account</a>
          </div>
          
          <p>If you did not create this account, please contact our support team immediately.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rejuvenexx. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  return await sendEmail(mailOptions);
}

// Contact form email function
const sendContactEmail = async (formData) => {
  const { name, email, subject, message } = formData;
  console.log('formdata', formData)
  // Validate required fields
  if (!email || !name || !subject || !message) {
    console.error('Missing required fields for contact email:', { name, email, subject, message });
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email format:', email);
    return false;
  }

  // Validate admin email
  if (!process.env.EMAIL_USER) {
    console.error('Admin email not configured in environment variables');
    return false;
  }
  
  // Send confirmation email to customer
  const customerMailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Thank you for contacting Rejuvenex",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6B46C1;">Thank you for contacting Rejuvenex!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message details:</strong></p>
        <ul>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        <p>Best regards,<br>The Rejuvenex Team</p>
      </div>
    `
  };

  // Send notification email to admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6B46C1;">New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>
    `
  };

  try {
    console.log('Sending contact form emails...');
    console.log('Customer email:', email);
    console.log('Admin email:', process.env.EMAIL_USER);
    
    // Send both emails
    const [customerEmailSent, adminEmailSent] = await Promise.all([
      sendEmail(customerMailOptions),
      sendEmail(adminMailOptions)
    ]);

    if (!customerEmailSent || !adminEmailSent) {
      console.error('Email sending failed:', { customerEmailSent, adminEmailSent });
      throw new Error('Failed to send one or both emails');
    }

    console.log('Contact form emails sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending contact form emails:', error);
    return false;
  }
};

// Export all functions
module.exports = {
  sendVerificationEmail,
  sendOrderStatusEmail,
  sendPasswordResetEmail,
  sendAffiliateStatusEmail,
  sendCredentialsEmail,
  sendContactEmail
};
